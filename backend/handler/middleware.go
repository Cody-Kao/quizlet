package handler

import (
	"fmt"
	"go-quizlet/Consts"
	"go-quizlet/Type"
	"log"
	"net/http"
	"os"
	"slices"
	"strings"
	"sync"

	"golang.org/x/time/rate"
)

// http.HandlerFunc is also implemented the interface the http.Handler
// and the func (w http.ResponseWriter, r *http.Request) is a form of http.HandlerFunc, but not essentially
type middlewareFunc func(http.Handler) http.Handler

func chainMiddleware(h http.Handler, m ...middlewareFunc) http.Handler {
	for i := len(m) - 1; i >= 0; i-- {
		h = m[i](h)
	}
	return h
}

// 直接包mux讓此middleware變成default
func EnableCORS(next http.Handler) http.Handler {
	// 包http.HandlerFunc()，讓裡面func(w http.ResponseWriter, r *http.Request) AKA HandlerFunc 變http.Handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowedOrigin := os.Getenv("FrontendPATH") // Change to your frontend URL
		if allowedOrigin == "" {
			allowedOrigin = "http://localhost:5173"
		}
		allowedOrigins := strings.Split(allowedOrigin, " ") // 用空格區分不同origin
		origin := r.Header.Get("Origin")
		fmt.Println(origin)
		if slices.Contains(allowedOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			w.WriteHeader(http.StatusForbidden) // 403 Forbidden
			writeErrorJson(w, Type.MessageDisplayError{Message: fmt.Sprintf("%s CORS violated", origin)})
			return
		}
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// 用sync map儲存ip對應limiter
var limiterIPMap sync.Map

// API rate limiter
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
		IP, err := getIP(r)
		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: "IP出錯"})
			log.Println("取得IP出錯", err.Error())
			return
		}
		limiterAny, _ := limiterIPMap.LoadOrStore(IP, rate.NewLimiter(Consts.APILimit, Consts.APIBurst))
		limiter := limiterAny.(*rate.Limiter)

		if !limiter.Allow() {
			writeErrorJson(w, Type.MessageDisplayError{Message: "太多請求 請稍後"})
			log.Println("IP", IP, "短時間送出太多請求")
			return
		}
		next.ServeHTTP(w, r)
	})
}