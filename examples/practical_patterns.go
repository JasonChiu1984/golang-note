package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
)

type APIUser struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

func runPracticalPatterns() {
	fmt.Println("\n-- practical standard library --")

	body, err := json.Marshal(APIUser{ID: 7, Name: "Grace"})
	if err != nil {
		fmt.Println("json failed:", err)
		return
	}
	fmt.Println("json:", string(body))

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	fmt.Println("http status:", recorder.Code)
}
