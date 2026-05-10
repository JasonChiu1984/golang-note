package main

import "fmt"

func runBasicSyntax() {
	fmt.Println("\n-- basic syntax --")

	const serviceName = "crawler"
	var retry int
	name := "Gopher"
	score, passed := 88, true

	fmt.Printf("service=%s retry=%d name=%s score=%d passed=%t\n", serviceName, retry, name, score, passed)

	if grade := grade(score); grade == "A" {
		fmt.Println("grade A: keep going")
	} else {
		fmt.Println("grade:", grade)
	}

	for i := 0; i < 3; i++ {
		fmt.Printf("loop %d ", i)
	}
	fmt.Println()

	status := "running"
	switch status {
	case "new":
		fmt.Println("status: create task")
	case "running":
		fmt.Println("status: monitor task")
	default:
		fmt.Println("status: ignore")
	}
}

func grade(score int) string {
	switch {
	case score >= 90:
		return "A"
	case score >= 80:
		return "B"
	default:
		return "C"
	}
}
