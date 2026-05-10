package main

import "fmt"

type User struct {
	ID   int
	Name string
}

func (u User) DisplayName() string {
	return fmt.Sprintf("%d:%s", u.ID, u.Name)
}

func (u *User) Rename(name string) {
	u.Name = name
}

func runDataStructures() {
	fmt.Println("\n-- data structures --")

	nums := []int{1, 2, 3}
	nums = append(nums, 4)
	fmt.Println("slice:", nums, "len:", len(nums), "cap:", cap(nums))

	counts := map[rune]int{}
	for _, r := range "台灣GoGo" {
		counts[r]++
	}
	fmt.Println("rune counts:", counts)

	user := User{ID: 1, Name: "Amy"}
	fmt.Println("before:", user.DisplayName())
	user.Rename("Ada")
	fmt.Println("after:", user.DisplayName())
}
