package server

import (
	"fmt"
	"go-quizlet/Consts"
	"go-quizlet/handler"
	"net/http"
	"time"
)

func CreateServer() *http.Server {
	port := Consts.PORT
	if port == "" {
		port = "5000" // fallback for local dev
	}
	return &http.Server{
		Addr:fmt.Sprintf("0.0.0.0:%s", port),
		Handler: handler.CreateHandler(),
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
	}
}