package main

import (
	"fmt"
	"go-quizlet/DB"
	"go-quizlet/server"
	"log"
)


func main() {
	DB.InitDB()
	defer DB.DisconnectDB()
	server := server.CreateServer()
	fmt.Println("server is running on: 5000")
	log.Fatal(server.ListenAndServe())
	
}