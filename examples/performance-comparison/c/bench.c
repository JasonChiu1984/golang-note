#include <stdint.h>
#include <stdio.h>
#include <time.h>

#define ITERATIONS 50000000ULL

static uint64_t run(uint64_t iterations) {
  uint64_t acc = 1469598103934665603ULL;
  for (uint64_t i = 0; i < iterations; i++) {
    acc ^= i + 0x9e3779b97f4a7c15ULL;
    acc *= 1099511628211ULL;
    acc ^= acc >> 32;
  }
  return acc;
}

int main(void) {
  clock_t start = clock();
  uint64_t result = run(ITERATIONS);
  clock_t end = clock();
  double seconds = (double)(end - start) / CLOCKS_PER_SEC;
  printf("language=C iterations=%llu result=%llu seconds=%.6f\n",
         (unsigned long long)ITERATIONS,
         (unsigned long long)result,
         seconds);
  return 0;
}

