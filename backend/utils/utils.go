package utils

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go-quizlet/Consts"
	"go-quizlet/Type"
	"html/template"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strings"
	"time"

	"slices"

	"crypto/rand"
	"math/big"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
	"gopkg.in/gomail.v2"
)

func GenerateID() string {
	return uuid.New().String()
}

func GetTodayFormatted() string {
	return time.Now().Format("2006/01/02")
}

func GetNow() int64 {
	return time.Now().Unix()
}

func GetWelcomeLetter(userName string) string {
	return fmt.Sprintf("哈囉! <b>%s</b>，誠摯地歡迎您加入Quiz\n這裡多了您一定會變得更好! 也期待在這裡您能有所收穫!<br>讓我們一起努力 一起在學習的路上並肩同行<br>期待您的成長與蛻變，祝福您喔~~~", userName)
}

func IsValidSound(sound string) error {
	flag := slices.Contains([]string{"en-US", "en-GB", "en-AU", "zh-TW", "zh-CN"}, strings.TrimSpace(sound)) 
	if !flag {
		return errors.New("聲音格式錯誤(en-US, en-GB, en-AU, zh-TW, zh-CN)")
	}
	return nil
}

func VerifyGoogleCredential(credential string) (*idtoken.Payload, error)  {
	// The Google OAuth2 client ID that you used to configure the client-side
    clientID := Consts.JWTClientID

    // Validate the token with Google's API
    payload, err := idtoken.Validate(context.Background(), credential, clientID)
    if err != nil {
        return nil, err
    }
    return payload, nil
}

// 驗證使用者名稱格式
var alphanumericRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
func IsValidName(name string) bool {
	return alphanumericRegex.MatchString(name)
}

// 驗證電子郵件格式(可加強驗證該email是否存在)
func IsValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// 驗證密碼
// Allowed special characters
const allowedSpecialChars = `@$!%*?&`

// Regex patterns for password validation
var (
	lowercaseRegex   = regexp.MustCompile(`[a-z]`)
	uppercaseRegex   = regexp.MustCompile(`[A-Z]`)
	numberRegex      = regexp.MustCompile(`\d`)
	specialCharRegex = regexp.MustCompile(`[` + allowedSpecialChars + `]`) // Checks for at least one allowed special character
	invalidCharRegex = regexp.MustCompile(`[^a-zA-Z0-9` + allowedSpecialChars + `]`) // Checks for any disallowed characters
)

// ValidatePassword checks each condition separately and returns specific error messages
func IsValidPassword(password string) error {
	if len(password) < 8 || len(password) > 20 {
		return errors.New("密碼長度須為8至20")
	}
	if !lowercaseRegex.MatchString(password) {
		return errors.New("密碼至少包含一個小寫英文字母")
	}
	if !uppercaseRegex.MatchString(password) {
		return errors.New("密碼至少包含一個大寫英文字母")
	}
	if !numberRegex.MatchString(password) {
		return errors.New("密碼至少包含一個數字")
	}
	if !specialCharRegex.MatchString(password) {
		return errors.New("密碼至少包含一個特殊字元(" + allowedSpecialChars + ")")
	}
	if invalidCharRegex.MatchString(password) {
		return errors.New("密碼含有未知字元 合法特殊字元為(" + allowedSpecialChars + ")")
	}
	return nil // Password is valid
}

func GenerateSixDigitCode() (int, error) {
	// Range: 100000 to 999999 inclusive (i.e., 900000 possibilities)
	nBig, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		log.Println(err)
		return 0, err
	}
	code := int(nBig.Int64()) + 100000
	return code, nil
}

// HashPassword generates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("hashing password error", err.Error())
		return "", err
	}
	return string(hashedPassword), nil
}

// CheckPassword compares a plaintext password with a hashed password
func CheckHashedPassword(plainPassword, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}

// sign JWT
func SignJWT(userID string, expireTime time.Time) (string , error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userID": userID,
		// 7 days before expiring
		"expire": expireTime.Unix(),
	})
	
	// Sign and get the complete encoded token as a string using the secret
	secret := os.Getenv("JWTSecret")
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
// validate JWT
func IsValidJWT(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}
	
		// it is a []byte containing your secret, e.g. []byte("my_secret_key")
		return []byte(os.Getenv("JWTSecret")), nil
	})
	if err != nil {
		return nil, err
	}
	
	// check if JWT token is expired
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("JWT claims failed")
	}
	// 確認expire是存在的field(這步驟是保險起見，要使用任何解構JWT後的json欄位都要檢查)
	expireTime, ok := claims["expire"].(float64)
        if !ok {
            return nil, fmt.Errorf("無效的使用者ID")
        }
	if expireTime < float64(time.Now().Unix()) {
		return nil, fmt.Errorf("JWT token is expired")
	}

	return token, nil
}

// Cookie 
func GetJWTCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie("JWT")
	if err != nil {
		return "", nil
	}
	return cookie.Value, nil
}

func SetJTWCookie(w http.ResponseWriter, tokenString string, expireTime time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "JWT",
		Domain:   Consts.DOMAIN,
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,  // Prevents JavaScript access (protects against XSS)
		Secure:   true,  // Ensures cookie is only sent over HTTPS
		SameSite: http.SameSiteStrictMode, // 如果是strict mode就能Prevents CSRF attacks，但用CORS去檔也可以
		Expires:  expireTime,
	})
}

func RemoveJWTCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "JWT",
		Domain:   Consts.DOMAIN,
		Value:    "",                   // Empty value
		Path:     "/",                  // Must match original cookie path
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Unix(0, 0),      // Expired timestamp
		MaxAge:   -1,                   // Forces deletion
	})
}

// 在任何非GET的請求 都要確認使用者是登入的狀態
func CheckLogIn(w http.ResponseWriter, r *http.Request) (*jwt.Token, error) {
	tokenString, err := GetJWTCookie(r)
	if err != nil {
		return nil, err
	}
	token, err := IsValidJWT(tokenString)
	if err != nil {
		return nil, err
	}
	return token, nil
}

func UploadToImgur(file io.Reader, filename string) (*Type.ImgurResponse, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// Create form file
	part, err := writer.CreateFormFile("image", filename)
	if err != nil {
		return nil, fmt.Errorf("could not create form file: %v", err)
	}

	// Copy file data
	if _, err = io.Copy(part, file); err != nil {
		return nil, fmt.Errorf("could not copy file data: %v", err)
	}

	// Close multipart writer
	if err = writer.Close(); err != nil {
		return nil, fmt.Errorf("could not close writer: %v", err)
	}

	// Create request
	req, err := http.NewRequest("POST", Consts.ImgurUploadURL, &body)
	if err != nil {
		return nil, fmt.Errorf("could not create request: %v", err)
	}

	// Set headers
	
	req.Header.Set("Authorization", "Bearer " + Consts.ImgurAccessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()
	fmt.Println("response", resp)
	// Decode response
	var imgurResp Type.ImgurResponse
	if err = json.NewDecoder(resp.Body).Decode(&imgurResp); err != nil {
		return nil, fmt.Errorf("could not decode response: %v", err)
	}

	return &imgurResp, nil
}

func SendEmailWithTimeout(htmlPath, mailTitle, toMail, data string, timeout time.Duration) error {
	errChan := make(chan error, 1)
	log.Println("sending to:",toMail)
	go func() {
		errChan <- SendEmail(htmlPath, mailTitle, toMail, data)
	}()

	select {
	case err := <-errChan:
		return err
	case <-time.After(timeout):
		return errors.New("寄送郵件逾時，請稍後再試")
	}
}

func SendEmail(htmlPath string, mailTitle string, toMail string, data string) error {
	var htmlBody bytes.Buffer
	t, err := template.ParseFiles(htmlPath)
	if err != nil {
		log.Println(err)
		return errors.New("HTML解析錯誤")
	}
	err = t.Execute(&htmlBody, Type.EmailHTMLDate{Email: toMail, Data: data})
	if err != nil {
		log.Println(err)
		return errors.New("HTML執行錯誤")
	}
	m := gomail.NewMessage()
	m.SetHeader("From", os.Getenv("MAIL_USERNAME"))
	m.SetHeader("To", toMail)
	//m.SetAddressHeader("Cc", "dan@example.com", "Dan")
	m.SetHeader("Subject", mailTitle)
	m.SetBody("text/html", htmlBody.String())
	//m.Attach("") // 可以用來傳送logo
	d := gomail.NewDialer("smtp.gmail.com", 587, os.Getenv("MAIL_USERNAME"), os.Getenv("MAIL_PASSWORD"))

	// Send the email to Bob, Cora and Dan.
	if err := d.DialAndSend(m); err != nil {
		return err
	}

	return nil
}