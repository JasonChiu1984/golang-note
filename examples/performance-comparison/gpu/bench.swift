import Foundation
import Metal

let elements = Int(ProcessInfo.processInfo.environment["GPU_ELEMENTS"] ?? "1048576") ?? 1_048_576
let rounds = UInt32(ProcessInfo.processInfo.environment["GPU_ROUNDS"] ?? "128") ?? 128

@inline(__always)
func mix(_ value: UInt64, rounds: UInt32) -> UInt64 {
    var x = value
    for _ in 0..<rounds {
        x ^= x >> 12
        x ^= x << 25
        x ^= x >> 27
        x = x &* 0x2545F4914F6CDD1D
    }
    return x
}

func seconds(_ start: UInt64, _ end: UInt64) -> Double {
    Double(end - start) / 1_000_000_000.0
}

func runCPU(elements: Int, rounds: UInt32) -> (seconds: Double, checksum: UInt64) {
    var checksum: UInt64 = 0
    let start = DispatchTime.now().uptimeNanoseconds
    for i in 0..<elements {
        let seed = (UInt64(i) &+ 1) &* 0x9E3779B97F4A7C15
        checksum = checksum &+ mix(seed, rounds: rounds)
    }
    let end = DispatchTime.now().uptimeNanoseconds
    return (seconds(start, end), checksum)
}

let source = """
#include <metal_stdlib>
using namespace metal;

kernel void hash_kernel(device ulong *output [[buffer(0)]],
                        constant uint &rounds [[buffer(1)]],
                        uint id [[thread_position_in_grid]]) {
    ulong x = ((ulong)id + 1ul) * 0x9E3779B97F4A7C15ul;
    for (uint i = 0; i < rounds; i++) {
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        x *= 0x2545F4914F6CDD1Dul;
    }
    output[id] = x;
}
"""

guard let device = MTLCreateSystemDefaultDevice() else {
    fputs("error=metal_device_unavailable\n", stderr)
    exit(2)
}

let cpu = runCPU(elements: elements, rounds: rounds)

do {
    let library = try device.makeLibrary(source: source, options: nil)
    guard let function = library.makeFunction(name: "hash_kernel") else {
        fputs("error=metal_kernel_missing\n", stderr)
        exit(3)
    }
    let pipeline = try device.makeComputePipelineState(function: function)
    guard let queue = device.makeCommandQueue(),
          let buffer = device.makeBuffer(length: elements * MemoryLayout<UInt64>.stride, options: [.storageModeShared]) else {
        fputs("error=metal_resource_allocation_failed\n", stderr)
        exit(4)
    }

    var roundsValue = rounds
    let totalStart = DispatchTime.now().uptimeNanoseconds
    guard let commandBuffer = queue.makeCommandBuffer(),
          let encoder = commandBuffer.makeComputeCommandEncoder() else {
        fputs("error=metal_command_encoder_failed\n", stderr)
        exit(5)
    }

    encoder.setComputePipelineState(pipeline)
    encoder.setBuffer(buffer, offset: 0, index: 0)
    encoder.setBytes(&roundsValue, length: MemoryLayout<UInt32>.stride, index: 1)
    let threadgroupWidth = min(pipeline.maxTotalThreadsPerThreadgroup, 256)
    let threadsPerThreadgroup = MTLSize(width: threadgroupWidth, height: 1, depth: 1)
    let threadsPerGrid = MTLSize(width: elements, height: 1, depth: 1)
    let kernelStart = DispatchTime.now().uptimeNanoseconds
    encoder.dispatchThreads(threadsPerGrid, threadsPerThreadgroup: threadsPerThreadgroup)
    encoder.endEncoding()
    commandBuffer.commit()
    commandBuffer.waitUntilCompleted()
    let kernelEnd = DispatchTime.now().uptimeNanoseconds

    let pointer = buffer.contents().bindMemory(to: UInt64.self, capacity: elements)
    var gpuChecksum: UInt64 = 0
    for i in 0..<elements {
        gpuChecksum = gpuChecksum &+ pointer[i]
    }
    let totalEnd = DispatchTime.now().uptimeNanoseconds

    let status = cpu.checksum == gpuChecksum ? "ok" : "checksum_mismatch"
    print("language=SwiftMetal workload=parallel_hash elements=\(elements) rounds=\(rounds) cpu_seconds=\(String(format: "%.6f", cpu.seconds)) gpu_kernel_seconds=\(String(format: "%.6f", seconds(kernelStart, kernelEnd))) gpu_total_seconds=\(String(format: "%.6f", seconds(totalStart, totalEnd))) cpu_checksum=\(cpu.checksum) gpu_checksum=\(gpuChecksum) status=\(status) gpu_device=\"\(device.name)\"")
    if status != "ok" {
        exit(6)
    }
} catch {
    fputs("error=\(error)\n", stderr)
    exit(7)
}
