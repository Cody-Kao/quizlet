package Type

// 處裡所有error response payload type
type MessageDisplayError struct {
	Message string `json:"message"`
}

type PageDisplayError struct {
	StatusCode int `json:"statusCode"`
	Message string `json:"message"`
}
