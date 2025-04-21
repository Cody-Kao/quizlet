package server

import (
	"fmt"
	"go-quizlet/Consts"
	"go-quizlet/handler"
	"net/http"
	"time"
)

func CreateServer() *http.Server {
	return &http.Server{
		Addr:fmt.Sprintf("0.0.0.0:%s", Consts.PORT),
		Handler: handler.CreateHandler(),
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
	}
}