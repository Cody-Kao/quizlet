package DB

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var Client *mongo.Client
var err error 

func InitDB() {
	// Use the SetServerAPIOptions() method to set the version of the Stable API on the client
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(os.Getenv("mongoDB_uri")).SetServerAPIOptions(serverAPI)

	// 最多10秒的連線
	ConnectContext, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
	// Create a new client and connect to the server
	defer cancel()
	Client, err = mongo.Connect(ConnectContext, opts)
	if err != nil {
		panic(err)
	}
	// Send a ping to confirm a successful connection
	if err := Client.Database("admin").RunCommand(context.Background(), bson.D{{"ping", 1}}).Err(); err != nil {
		panic(err)
	}
	fmt.Println("Pinged your deployment. You successfully connected to MongoDB!")
}

func DisconnectDB() {
	if err := Client.Disconnect(context.Background()); err != nil {
		panic(err)
	}
	fmt.Println("disconnect DB")
}