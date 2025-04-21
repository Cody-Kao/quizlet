package server

import (
	"go-quizlet/handler"
	"net/http"
	"time"
)

func CreateServer() *http.Server {
	return &http.Server{
		Addr:":5000",
		Handler: handler.CreateHandler(),
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
	}
}