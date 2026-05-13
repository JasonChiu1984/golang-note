import time

ITERATIONS = 50_000_000
MASK = (1 << 64) - 1


def run(iterations: int = ITERATIONS) -> int:
    acc = 1469598103934665603
    for i in range(iterations):
        acc ^= i + 0x9E3779B97F4A7C15
        acc = (acc * 1099511628211) & MASK
        acc ^= acc >> 32
    return acc


if __name__ == "__main__":
    start = time.perf_counter()
    result = run()
    elapsed = time.perf_counter() - start
    print(f"language=Python iterations={ITERATIONS} result={result} seconds={elapsed:.6f}")

