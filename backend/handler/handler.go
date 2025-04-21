package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go-quizlet/Consts"
	"go-quizlet/DB"
	"go-quizlet/Type"
	"go-quizlet/utils"
	"log"
	"net"
	"slices"
	"sort"
	"strconv"
	"sync"

	//"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-playground/validator"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/time/rate"
)

// 用來validate bson field
var validate = validator.New()

// 若不知道放甚麼到payload，可以用這個
//var payloadPlaceholder = struct{}{}

// 任何資料相關操作都要附上userID，確保是本人要求更改，並加上CORS的middleware

// http.HandlerFunc is also implemented the interface the http.Handler
// and the func (w http.ResponseWriter, r *http.Request) is a form of http.HandlerFunc, but not essentially
type middlewareFunc func(http.Handler) http.Handler

func chainMiddleware(h http.Handler, m ...middlewareFunc) http.Handler {
	for i := len(m) - 1; i >= 0; i-- {
		h = m[i](h)
	}
	return h
}

func CreateHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", handleHome)
	mux.HandleFunc("GET /checkLogIn", handleCheckLogIn)
	mux.HandleFunc("POST /accountPasswordRegister", handleAccountPasswordRegister)
	mux.HandleFunc("POST /OAuthRegister", handleOAuthRegister)
	mux.HandleFunc("POST /accountPasswordLogIn", handleAccountPasswordLogIn)
	mux.HandleFunc("POST /OAuthLogIn", handleOAuthLogIn)
	mux.HandleFunc("POST /logOut", handleLogOut)
	mux.HandleFunc("GET /getUserLink/{userID}", handleGetUserLink)
	mux.HandleFunc("POST /createWordSet", PostValidateUser(handleCreateWordSet))
	mux.HandleFunc("GET /getWordSet/{wordSetID}", handleGetWordSet)
	// 這是給search bar的handler
	mux.HandleFunc("GET /getWordSetCard/", handleGetWordSetCard) // 多一個trailing slash才可以放query params
	mux.HandleFunc("GET /getPreviewWords/", handleGetPreviewWords) // handling querying words for preview
	mux.HandleFunc("GET /getWords/{wordSetID}", handleGetWords) // handling querying words for full wordCard
	//mux.HandleFunc("POST /updateWordElement", handleUpdateWordElement)
	mux.HandleFunc("POST /updateWordSet", PostValidateWordSetAuthor(UpdateWordSet))
	mux.HandleFunc("POST /deleteWordSet", PostValidateWordSetAuthor(deleteWordSet))
	mux.HandleFunc("POST /addWord", PostValidateWordSetAuthor(addWord))
	mux.HandleFunc("POST /deleteWord", PostValidateWordSetAuthor(deleteWord)) // 貌似沒用到這個route
	mux.HandleFunc("POST /toggleWordStar", PostValidateWordSetAuthor(toggleWordStar))
	mux.HandleFunc("POST /toggleAllWordStar", PostValidateWordSetAuthor(toggleAllWordStar))
	mux.HandleFunc("POST /inlineUpdateWord", PostValidateWordSetAuthor(inlineUpdateWord))
	mux.HandleFunc("POST /bigWordCardUpdateWord", PostValidateWordSetAuthor(bigWordCardUpdateWord))
	mux.HandleFunc("GET /getWordSetsInLib/{userID}", getWordSetsInLib)
	mux.HandleFunc("POST /changeUserImage", changeUserImage)
	mux.HandleFunc("POST /changeUserName", PostValidateUser(changeUserName))
	mux.HandleFunc("POST /changeUserEmail", PostValidateUser(changeUserEmail))
	mux.HandleFunc("POST /toggleLikeWordSet", PostValidateUser(toggleLikeWordSet))
	mux.HandleFunc("POST /forkWordSet", PostValidateUser(ForkWordSet))
	mux.HandleFunc("GET /getMails/{userID}", GetValidateUser(getMails))
	mux.HandleFunc("GET /getUnreadMailsCnt/{userID}", GetValidateUser(getUnreadMailsCnt))
	mux.HandleFunc("POST /readMail", PostValidateUser(readMail))
	mux.HandleFunc("POST /addRecentVisit", PostValidateUser(addRecentVisit))
	mux.HandleFunc("GET /getRecentVisit/{userID}", getRecentVisit)
	mux.HandleFunc("GET /getNewWordSet", getNewWordSet)
	mux.HandleFunc("GET /getPopularWordSet", getPopularWordSet)
	mux.HandleFunc("GET /getFeedback/", getFeedback)
	mux.HandleFunc("POST /createFeedback", PostValidateUser(createFeedback))
	mux.HandleFunc("POST /toggleAllowCopy", PostValidateUser(toggleAllowCopy))
	mux.HandleFunc("POST /toggleIsPublic", PostValidateUser(toggleIsPublic))
	mux.HandleFunc("POST /logError", PostValidateUser(logError)) // log error sent from ErrorBoundary
	mux.HandleFunc("POST /requestValidateCode/", requestValidateCode)
	mux.HandleFunc("POST /resetPassword", resetPassword)
	mux.HandleFunc("POST /sendActivationEmail", sendActivationEmail)
	mux.HandleFunc("POST /activateEmail", activateEmail)
	return chainMiddleware(mux, EnableCORS, RateLimit) // 用CORS middleware包裹住mux 並回傳
}

// 取得用戶IP
func getIP(r *http.Request) (string, error) {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return "", err
	}
	return host, nil
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

/*
--------------------------------------------------------------
若使用者刪除帳號，在透過AuthorID查找相對的userID時會出錯，尚未解決!
--------------------------------------------------------------
*/

// 用來回覆要使用者登入 所以前端要判斷type是To Log In還是Error還是Success
// 這個會強制讓前端登出使用者(如果憑證過期)/要求使用者登入(沒憑證)
// 主要用在Post操作時驗證JWT的時候
func CallToLogInJson(w http.ResponseWriter, errorBody Type.Payload) {
	w.Header().Add("content-type", "application/json")
	json.NewEncoder(w).Encode(Type.Response{Type:"To Log In", Payload: errorBody})
}
// 用來回覆error
func writeErrorJson(w http.ResponseWriter, errorBody Type.Payload) {
	w.Header().Add("content-type", "application/json")
	json.NewEncoder(w).Encode(Type.Response{Type:"Error", Payload: errorBody})
}
// 用來回覆成功的data
func writeDataJson(w http.ResponseWriter, data Type.Payload) error {
	w.Header().Add("content-type", "application/json")
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Success", Payload: data}); err != nil {
		return err
	}
	return nil 
}

// 從DB用ID拿一個user的函數
func getUserByID(userID string) (*Type.User, error) {
	var user Type.User
	coll := DB.Client.Database("go-quizlet").Collection("users")
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{"id":userID}
	err := coll.FindOne(findingContext, filter).Decode(&user)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, errors.New("超時錯誤 請重試")
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("查無使用者")
		}
		return nil, errors.New("未知錯誤 請重試")
	}

	return &user, nil
}
// 從DB拿一個wordSet的函數
func getWordSetByID(wordSetID string) (*Type.WordSet, error) {
	var wordSet Type.WordSet
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{"id":wordSetID}
	err := coll.FindOne(findingContext, filter).Decode(&wordSet)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, errors.New("超時錯誤 請重試")
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("查無單字集")
		}
		return nil, errors.New("未知錯誤 請重試")
	}

	return &wordSet, nil
}
// 從DB拿recentVisit
func getRecentVisitByID(userID string) (*Type.RecentVisit, error) {
	coll := DB.Client.Database("go-quizlet").Collection("recentVisit")
	filter := bson.M{"id":userID}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var recentVisit Type.RecentVisit
	err := coll.FindOne(findingContext, filter).Decode(&recentVisit)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, errors.New("超時錯誤 請重試")
		}
		if err == mongo.ErrNilDocument {
			return nil, errors.New("查無使用者")
		}
		return nil, errors.New("未知錯誤 請重試")
	}
	return &recentVisit, nil
}

func handleHome(w http.ResponseWriter, r *http.Request) {
	_, err := utils.CheckLogIn(w, r)
	if err != nil {
		fmt.Fprint(w, "User not log in")
		return
	}
	fmt.Fprint(w, "Hello")
}

// 給前端context用來抓是否登入的 並返還user
func handleCheckLogIn(w http.ResponseWriter, r *http.Request) {
	token, err := utils.CheckLogIn(w, r)
	if err != nil {
		fmt.Println("User not log in! Exit the post handler")
		writeErrorJson(w, Type.MessageDisplayError{Message: "使用者未登入! 或憑證已過期!"})
		return
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤!"})
		return
	}
	
	// 確認有userID這個欄位
	userID, ok := claims["userID"].(string) 
	if !ok || userID == "" {
		writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤!"})
		return
	}

	DBUser, err := getUserByID(userID)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}

	user := Type.FrontEndUser{ID:DBUser.ID, Role: DBUser.Role, Name: DBUser.Name, Email: DBUser.Email, 
		Img:DBUser.Img, LikedWordSets: DBUser.LikedWordSets}
	fmt.Println("check log in from backend", user)
	err = writeDataJson(w, user)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		return
	}
}

func handleAccountPasswordRegister(w http.ResponseWriter, r *http.Request) {
	var request Type.AccountPasswordRegisterRequest
	json.NewDecoder(r.Body).Decode(&request)
	defer r.Body.Close()
	// validate
	if err := validate.Struct(request); err != nil {
		// Handle validation error
		writeErrorJson(w, Type.MessageDisplayError{Message: "invalid request format"})
		return
	}
	userName := strings.TrimSpace(request.UserName)
	if len(userName) == 0 {
		writeErrorJson(w, Type.MessageDisplayError{Message: "使用者名稱不得為空"})
		return
	}
	if len(userName) > Consts.MaxNameLen {
		writeErrorJson(w, Type.MessageDisplayError{Message: "使用者名稱不得超過12字元"})
		return 
	}
	if userName == Consts.ADMINNAME {
		writeErrorJson(w, Type.MessageDisplayError{Message: fmt.Sprintf("使用者名稱不得為%s", Consts.ADMINNAME)})
		return 
	}
	if !utils.IsValidName(userName) {
		writeErrorJson(w, Type.MessageDisplayError{Message: "使用者名稱只能包含英文、數字、底線"})
		return 
	}
	
	if !utils.IsValidEmail(request.UserEmail) {
		writeErrorJson(w, Type.MessageDisplayError{Message: "帳號電子郵件格式錯誤"})
		return 
	}

	if err := utils.IsValidPassword(request.UserPassword); err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return 
	}
	if request.UserPassword != request.ReUserPassword {
		writeErrorJson(w, Type.MessageDisplayError{Message: "兩次密碼輸入不一致"})
		return 
	}

	// 檢查電子郵件是否有被開通
	var record Type.ActivateEmail
	activateEmailColl := DB.Client.Database("go-quizlet").Collection("activateEmail")
	filter := bson.M{"email":request.UserEmail}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err := activateEmailColl.FindOne(findingContext, filter).Decode(&record)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return 
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "此電子郵件尚未申請驗證"})
			return 
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤"})
		return 
	}
	if record.Activated == false {
		writeErrorJson(w, Type.MessageDisplayError{Message: "此電子郵件尚未通過開通驗證"})
		return 
	}
	// 確認是否在開通的有效期限
	if record.Expire < utils.GetNow() {
		writeErrorJson(w, Type.MessageDisplayError{Message: "電子郵件超過有效註冊時間"})
		return 
	}

	hashedPassword, err := utils.HashPassword(request.UserPassword)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤"})
		return 
	}
	mailColl := DB.Client.Database("go-quizlet").Collection("mails")
	userColl := DB.Client.Database("go-quizlet").Collection("users")
	recentVisitColl := DB.Client.Database("go-quizlet").Collection("recentVisit")
	filter = bson.M{"email": request.UserEmail}
	defer cancel()

	res := userColl.FindOne(findingContext, filter)
	if res.Err() == nil {
		// User exists
		writeErrorJson(w, Type.MessageDisplayError{Message: "此帳號已註冊"})
		return
	} else if res.Err() != mongo.ErrNoDocuments {
		// Some other database error occurred
		if res.Err() == context.DeadlineExceeded {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤"})
		} else {
			writeErrorJson(w, Type.MessageDisplayError{Message: "伺服器錯誤 請重試"})
		}
		return
	}
	// generate userID、mailID
	userID := utils.GenerateID()
	mailID := utils.GenerateID()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	session, err := DB.Client.StartSession()
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "無法開始會話 請重試"})
		return
	}
	defer session.EndSession(ctx)
	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {

		// 先創建歡迎信件
		_, err = mailColl.InsertOne(ctx, Type.MailViewType{
			ID: mailID,
			Title: "歡迎信件",
			Content: utils.GetWelcomeLetter(userName),
			Date: utils.GetNow(),
			ReceiverID: userID,
			Read: false,
		})
		if err != nil {
			session.AbortTransaction(sc) // 交易失敗時回滾
			log.Println(err)
			return errors.New("資料庫錯誤 請重試")
		}
		// 創建使用者
		res, err := userColl.InsertOne(ctx, Type.User{
			ID:userID,
			Role: "user",
			Name:userName,
			Email: request.UserEmail,
			Mails: []string{mailID},
			Password: hashedPassword,
			Img:"",
			IsGoogle: false,
			CreatedWordSets: []string{},
			LikedWordSets: []string{},
			CreatedAt: utils.GetTodayFormatted(),
		})
		if err != nil {
			session.AbortTransaction(sc)
			log.Println(err)
			return errors.New("資料庫錯誤 請重試")
		}

		//創建使用者對應的recentVisit
		_, err = recentVisitColl.InsertOne(ctx, Type.RecentVisit{
			ID:userID,
			Record: []string{},
		})
		if err != nil {
			session.AbortTransaction(sc)
			log.Println(err)
			return errors.New("資料庫錯誤 請重試")
		}

		// 把電子郵件從activateEmail中移除
		filter = bson.M{"email": request.UserEmail}
		_, err = activateEmailColl.DeleteOne(ctx, filter)
		if err != nil {
			session.AbortTransaction(sc)
			log.Println(err)
			return errors.New("資料庫錯誤 請重試")
		}

		fmt.Println("account-password successfully register a new user", res.InsertedID)
		return nil
	})
	
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}

	// 簽發JWT
	tokenString, err := utils.SignJWT(userID, Consts.DefaultJWTExpireTime)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "JWT簽發錯誤 請重新登入"})
		return 
	}
	// 設定JWT到cookie
	utils.SetJTWCookie(w, tokenString, Consts.DefaultJWTExpireTime)
	
	writeDataJson(w, Type.FrontEndUser{ID:userID, Role: "user", Name: userName, Email: request.UserEmail, Img: "", LikedWordSets: []string{}})
}

func handleOAuthRegister(w http.ResponseWriter, r *http.Request) {
	var request Type.OAuthRegisterRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請求格式錯誤"})
		return
	}
	defer r.Body.Close()
	
	payload, err := utils.VerifyGoogleCredential(request.Credential)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
		return
	}
	
	email := payload.Claims["email"].(string)
	userColl := DB.Client.Database("go-quizlet").Collection("users")
	mailColl := DB.Client.Database("go-quizlet").Collection("mails")
	recentVisitColl := DB.Client.Database("go-quizlet").Collection("recentVisit")
	// Check if user already exists using email
	filter := bson.M{"email": email}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	res := userColl.FindOne(findingContext, filter)
	if res.Err() == nil {
		// User exists
		writeErrorJson(w, Type.MessageDisplayError{Message: "此帳號已註冊"})
		return
	} else if res.Err() != mongo.ErrNoDocuments {
		// Some other database error occurred
		if res.Err() == context.DeadlineExceeded {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤"})
		} else {
			writeErrorJson(w, Type.MessageDisplayError{Message: "伺服器錯誤 請重試"})
		}
		return
	}

	// At this point, we know the user doesn't exist, so create new user
	userID := utils.GenerateID()
	mailID := utils.GenerateID()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	session, err := DB.Client.StartSession()
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "無法開始會話 請重試"})
		return
	}
	defer session.EndSession(ctx)
	userName := strings.ReplaceAll(strings.TrimSpace(payload.Claims["name"].(string)), " ", "_") // 把空格換成底線 因為不想讓使用者名稱含有空格
	if userName == Consts.ADMINNAME {
		userName = "_"+userName+"_" 
	}
	userImg := payload.Claims["picture"].(string)
	
	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		// 先創建歡迎信件
		_, err = mailColl.InsertOne(ctx, Type.MailViewType{
			ID: mailID,
			Title: "歡迎信件",
			Content: utils.GetWelcomeLetter(userName),
			Date: utils.GetNow(),
			ReceiverID: userID,
			Read: false,
		})
		if err != nil {
			session.AbortTransaction(sc) // 交易失敗時回滾
			return errors.New("寫入錯誤 請重試")
		}
		newUser := Type.User{
			ID:              userID,
			Role:			 "user",
			Name:            userName,
			Email:           email,
			Mails: 		     []string{mailID},
			Img:             userImg,
			IsGoogle:        true,
			CreatedWordSets: []string{},
			LikedWordSets:   []string{},
			CreatedAt:       utils.GetTodayFormatted(),
		}
		
		// 創建使用者
		res, err := userColl.InsertOne(ctx, newUser)
		if err != nil {
			session.AbortTransaction(sc)
			if errors.Is(err, context.DeadlineExceeded) {
				return errors.New("超時錯誤")
			} else {
				return errors.New("未知錯誤 請重試")
			}
		}

		// 創建使用者對應的recentVisit
		_, err = recentVisitColl.InsertOne(ctx, Type.RecentVisit{
			ID:userID,
			Record: []string{},
		})
		if err != nil {
			session.AbortTransaction(sc)
			return errors.New("寫入錯誤 請重試")
		}
		
		log.Println("OAuth successfully registered a new user", res.InsertedID)
		return nil
	})

	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}
	
	

	// 簽發JWT
	tokenString, err := utils.SignJWT(userID, Consts.DefaultJWTExpireTime)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "JWT簽發錯誤 請重新登入"})
		return 
	}
	// 設定JWT到cookie
	utils.SetJTWCookie(w, tokenString, Consts.DefaultJWTExpireTime)
	
	writeDataJson(w, Type.FrontEndUser{ID:userID, Role: "user", Name: userName, Email: email, Img: userImg, LikedWordSets: []string{}})
}

// 處理一般account-password log in
func handleAccountPasswordLogIn(w http.ResponseWriter, r *http.Request) {
	var request Type.AccountPasswordLogInRequest
	json.NewDecoder(r.Body).Decode(&request)
	defer r.Body.Close()
	// validate
	if err := validate.Struct(request); err != nil {
		// Handle validation error
		writeErrorJson(w, Type.MessageDisplayError{Message: "帳密登入格式錯誤"})
		return
	}

	// check if the account exists
	coll := DB.Client.Database("go-quizlet").Collection("users")
	filter := bson.M{"email":request.UserEmail}
	var user Type.User
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err := coll.FindOne(findingContext, filter).Decode(&user)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "此帳號不存在"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		return
	}
	// 確認該帳號是否為OAuth而不是一般帳號
	if user.IsGoogle {
		writeErrorJson(w, Type.MessageDisplayError{Message: "帳號登入錯誤"})
		return
	}
	// check if the password is correct
	if ok := utils.CheckHashedPassword(request.UserPassword, user.Password); !ok {
		writeErrorJson(w, Type.MessageDisplayError{Message: "使用者密碼錯誤"})
		return
	}

	log.Printf("user %s successfully log in\n", user.Email)

	// sign JWT
	tokenString, err := utils.SignJWT(user.ID, Consts.DefaultJWTExpireTime)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "JWT簽發錯誤 請重試"})
		return
	}
	// store JWT to cookie
	utils.SetJTWCookie(w, tokenString, Consts.DefaultJWTExpireTime)

	log.Printf("user %s successfully log in then sign JWT\n", user.Email)
	writeDataJson(w, Type.FrontEndUser{ID:user.ID, Role: user.Role, Name: user.Name, Email: user.Email, Img: user.Img, LikedWordSets: user.LikedWordSets})
}


// 處理一OAuth log in
func handleOAuthLogIn(w http.ResponseWriter, r *http.Request) {
	var request Type.OAuthLogInRequest
	json.NewDecoder(r.Body).Decode(&request)
	defer r.Body.Close()
	// validate
	if err := validate.Struct(request); err != nil {
		// Handle validation error
		writeErrorJson(w, Type.MessageDisplayError{Message: "OAuth登入格式錯誤"})
		return
	}

	// check if the OAuth credential is valid
	payload, err := utils.VerifyGoogleCredential(request.Credential)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "wrong OAuth credential"})
		return
	} 
	
	// check if the account exists
	coll := DB.Client.Database("go-quizlet").Collection("users")
	filter := bson.M{"email":payload.Claims["email"].(string)}
	var user Type.User
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = coll.FindOne(findingContext, filter).Decode(&user)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "此帳號不存在"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}
	// 確認該帳號是否為一般帳號而不是OAuth
	if !user.IsGoogle {
		writeErrorJson(w, Type.MessageDisplayError{Message: "帳號登入錯誤"})
		return
	}

	log.Printf("user %s successfully log in\n", user.Email)

	// sign JWT
	tokenString, err := utils.SignJWT(user.ID, Consts.DefaultJWTExpireTime)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "JWT簽發錯誤 請重試"})
		return
	}
	// store JWT to cookie
	utils.SetJTWCookie(w, tokenString, Consts.DefaultJWTExpireTime)

	log.Printf("user %s successfully log in then sign JWT\n", user.Email)
	writeDataJson(w, Type.FrontEndUser{ID:user.ID, Role: user.Role, Name: user.Name, Email: user.Email, Img: user.Img, LikedWordSets: user.LikedWordSets})
}

// log out
func handleLogOut(w http.ResponseWriter, r *http.Request) {
	utils.RemoveJWTCookie(w)
	writeDataJson(w, Type.MessageDisplaySuccess{Message: "登出成功!"})
}

// get UserLink(適用於需要user ID/name/img)的任何場景
func handleGetUserLink(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userID")
	coll := DB.Client.Database("go-quizlet").Collection("users")
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var userLink Type.UserLink
	filter := bson.M{"id":userID}
	err := coll.FindOne(findingContext, filter).Decode(&userLink)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusNotFound, Message: "查無使用者"})
			return
		}
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "伺服器錯誤 請重試"})
		return
	}
	
	writeDataJson(w, userLink)
}

func GetValidateUser[T any](handlerFunc func(string) (T, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 先檢查使用者是否登入以及JWT是否過期了
		token, err := utils.CheckLogIn(w, r)
		if err != nil {
			fmt.Println("User not log in! Exit the post handler")
			CallToLogInJson(w, Type.MessageDisplayError{Message: "使用者未登入! 或憑證已過期!"})
			return
		}
		
		// 從JWT中取出userID
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
			return
		}
		userID, ok := claims["userID"].(string)
		if !ok {
			writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
			return
		}

		// 從path params拿userID
		id := r.PathValue("userID")
		if id != userID {
			writeErrorJson(w, Type.MessageDisplayError{Message: "使用者無權限"})
			return
		}

		// 檢查完畢，執行邏輯function
		data, err := handlerFunc(userID)
		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
			return
		}
		
		err = writeDataJson(w, data)
		
		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		}
	}
}

// 回傳MessageDisplayError的handler wrapper，這是一個很好的generic pattern in Golang
func PostValidateUser[T Type.UserRelatedRequest](handlerFunc func(T) (string, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 先檢查使用者是否登入以及JWT是否過期了
		token, err := utils.CheckLogIn(w, r)
		if err != nil {
			fmt.Println("User not log in! Exit the post handler")
			CallToLogInJson(w, Type.MessageDisplayError{Message: "使用者未登入! 或憑證已過期!"})
			return
		}
		
		var request T
		json.NewDecoder(r.Body).Decode(&request)
		defer r.Body.Close()
		
		// validate
		if err := validate.Struct(request); err != nil {
			// Handle validation error
			writeErrorJson(w, Type.MessageDisplayError{Message: "請求缺少必要欄位"})
			return
		}
		// 從JWT中取出userID
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
			return
		}
		userID, ok := claims["userID"].(string)
		if !ok {
			writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
			return
		}

		// 比對request的userID是否一致
		if request.GetUserID() != userID {
			writeErrorJson(w, Type.MessageDisplayError{Message: "使用者無權限變更"})
			return
		}

		// 檢查完畢，執行邏輯function
		id, err := handlerFunc(request)
		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
			return
		}
		
		if id != "" {
			err = writeDataJson(w, Type.MessageDisplaySuccess{Message: id})
		} else {
			err = writeDataJson(w, Type.MessageDisplaySuccess{Message: "使用者操作成功"})
		}

		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		}
	}
}

// 回傳MessageDisplayError的handler wrapper，這是改良上方讓他能在這裡用interface的方式去達成類似assertion的效果
// 可以call type T struct的function
func PostValidateWordSetAuthor[T Type.WordSetsRelatedRequest](handlerFunc func(T) (string, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 先檢查使用者是否登入以及JWT是否過期了
		token, err := utils.CheckLogIn(w, r)
		if err != nil {
			fmt.Println("User not log in! Exit the post handler")
			CallToLogInJson(w, Type.MessageDisplayError{Message: "使用者未登入! 或憑證已過期!"})
			return
		}
		
		var request T
		json.NewDecoder(r.Body).Decode(&request)
		defer r.Body.Close()
		
		// validate
		if err := validate.Struct(request); err != nil {
			// Handle validation error
			writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
			return
		}
		
		// 拿出wordSetID 之後並確認該user是這份wordSet的作者
		// 查詢wordSet
		coll := DB.Client.Database("go-quizlet").Collection("wordSets")
		findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var wordSet Type.WordSet
		filter := bson.M{"id":request.GetWordSetID()}
		err = coll.FindOne(findingContext, filter).Decode(&wordSet)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
				return
			}
			writeErrorJson(w, Type.MessageDisplayError{Message: "查無此單字集"})
			return
		}

		// 從token取得userID
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
			return
		}
		// 確保有userID這個欄位
		userID, ok := claims["userID"].(string)
		if !ok {
			writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
			return
		}
		// 比對作者
		if wordSet.AuthorID != userID {
			writeErrorJson(w, Type.MessageDisplayError{Message: "使用者無權限更改!"})
			return
		}

		// 一切成功後，執行真正的邏輯function
		id, err := handlerFunc(request)
		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
			return
		} 
		if id != "" {
			err = writeDataJson(w, Type.MessageDisplaySuccess{Message: id})
		} else {
			err = writeDataJson(w, Type.MessageDisplaySuccess{Message: "使用者/單字集驗證成功"})
		}
		if err != nil {
			writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		}
	}
}
// 直接包mux讓此middleware變成default
func EnableCORS(next http.Handler) http.Handler {
	// 包http.HandlerFunc()，讓裡面func(w http.ResponseWriter, r *http.Request) AKA HandlerFunc 變http.Handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowedOrigin := "http://localhost:5173" // Change to your frontend URL
		origin := r.Header.Get("Origin")
		fmt.Println(origin)
		if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
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


// 處理新建wordSet
func handleCreateWordSet(request Type.CreateWordSetRequest) (string, error) {
	fmt.Printf("%v\n",request)
	// 驗證單字字數跟註釋字數/Sound
	for _, word := range request.WordSet.Words {
		if len(word.Vocabulary) == 0 || len(word.Vocabulary) > Consts.MaxVocabularyLen {
			return "", errors.New("單字字數不得為0或超過100字元")
		}
		if len(word.Definition) == 0 || len(word.Definition) > Consts.MaxDefinitionLen {
			return "", errors.New("註釋字數不得為0或超過300字元")
		}
		if err := utils.IsValidSound(word.VocabularySound); err != nil {
			return "", err
		}
		if err := utils.IsValidSound(word.DefinitionSound); err != nil {
			return "", err
		}
	}
	// 在後端產生wordSetID
	newWordSetID := utils.GenerateID()
	request.WordSet.ID = newWordSetID
	// 在後端產生wordID
	for i := range request.WordSet.Words {
		request.WordSet.Words[i].ID = utils.GenerateID() // Modify the original slice element by reference
	}
	// 後端產生字數
	request.WordSet.WordCnt = len(request.WordSet.Words)
	// 後端標註createdAt跟updatedAt
	request.WordSet.CreatedAt = utils.GetTodayFormatted()
	request.WordSet.UpdatedAt = utils.GetNow()

	fmt.Printf("%v\n",request)
	
	// 寫入DB，用transaction
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	session, err := DB.Client.StartSession()
	if err != nil {
		return "", errors.New("資料庫錯誤 請重試")
	}
	defer session.EndSession(ctx)
	// Run transaction function
	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		// Start transaction
		if err := session.StartTransaction(); err != nil {
			return errors.New("資料庫錯誤 請重試")
		}
		// 取得 Collection
		wordSetColl := DB.Client.Database("go-quizlet").Collection("wordSets")
		userColl := DB.Client.Database("go-quizlet").Collection("users")

		// 插入 wordSet (使用 session context `sc`)
		insertRes, err := wordSetColl.InsertOne(sc, request.WordSet)
		if err != nil {
			session.AbortTransaction(sc) // 交易失敗時回滾
			if errors.Is(err, context.DeadlineExceeded) {
				return errors.New("超時錯誤 請重試")
			}
			return errors.New("未知錯誤 請重試")
		}
		fmt.Println("HandleCreateWordSet: 成功", "ID", insertRes.InsertedID)

		// wordSetID 寫入到 user 的 CreatedWordSets 陣列
		filter := bson.M{"id": request.UserID}
		update := bson.M{"$push": bson.M{"createdWordSets": newWordSetID}}

		updateRes, err := userColl.UpdateOne(sc, filter, update)
		if err != nil {
			session.AbortTransaction(sc) // 交易失敗時回滾
			if errors.Is(err, context.DeadlineExceeded) {
				return errors.New("超時錯誤 請重試")
			}
			return errors.New("未知錯誤 請重試")
		}
		if updateRes.MatchedCount == 0 {
			session.AbortTransaction(sc)
			return errors.New("查無使用者")
		}

		// ✅ 提交交易
		if err := session.CommitTransaction(sc); err != nil {
			return errors.New("交易提交失敗 請重試")
		}

		log.Println("create wordSet succeeds!")

		return nil
	})

	if err != nil {
		return "", err
	}

	return newWordSetID, nil
}

// 處理query wordSet
func handleGetWordSet(w http.ResponseWriter, r *http.Request) {
	wordSetID := r.PathValue("wordSetID")
	wordSet, err := getWordSetByID(wordSetID)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: err.Error()})
		return
	}
	err = writeDataJson(w, wordSet)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "未知錯誤 請重試"})
	}
}

// 處理search bar的搜尋結果
func handleGetWordSetCard(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query") // to get the query params called "query"
	if query == "" {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "搜尋值為空"})
		return
	}
	fmt.Println("query:", query)
	curNumber, err := strconv.Atoi(r.URL.Query().Get("curNumber")) // to get the query params called "curNumber"
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "搜尋值錯誤"})
		return
	}
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	filter := bson.M{"title":primitive.Regex{Pattern: fmt.Sprintf("^%s", query)}}
	// Create options for find with sort, skip and limit
	findOptions := options.Find()
	findOptions.SetSort(bson.M{"updatedAt": -1})	// Sort by updatedAt in descending order
	findOptions.SetSkip(int64(curNumber))			// Skip number of documents before curNumber
	findOptions.SetLimit(int64(Consts.MaxDataFetch+1)) // Limit to Consts.MaxDataFetch+1 documents
	defer cancel()
	cursor, err := coll.Find(findingContext, filter, findOptions)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: err.Error()})
			return
		}
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: err.Error()})
		return
	}
	wordSetCards := make([]Type.WordSetCard, 0, Consts.MaxDataFetch+1)
	if err = cursor.All(findingContext, &wordSetCards); err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "解析失敗"})
    	return
	}
	// 查詢是否還有多的資料
	haveMore := len(wordSetCards) > Consts.MaxDataFetch
	if haveMore {
		wordSetCards = wordSetCards[:Consts.MaxDataFetch] // 不取最後一個
	}
	response := Type.SearchWordSetResponse{
		WordSetCards: wordSetCards,
		HaveMore: haveMore,
	}
	fmt.Println(response)
	err = writeDataJson(w, response)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "未知錯誤 請重試"})
	}
}

// 處理請求preview words的
func handleGetPreviewWords(w http.ResponseWriter, r *http.Request) {
	wordSetID := r.URL.Query().Get("wordSetID") // to get the query params called "wordSetID"
	if wordSetID == "" {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "搜尋值為空"})
		return
	}
	curNumber, err := strconv.Atoi(r.URL.Query().Get("curNumber")) // to get the query params called "curNumber"
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "搜尋值為錯誤"})
		return
	}
	wordSet, err := getWordSetByID(wordSetID)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: err.Error()})
		return
	}
	// 查詢是否還有多的資料
	haveMore := curNumber + 6 < len(wordSet.Words)
	response := Type.PreviewWordsResponse{
		Words: wordSet.Words[curNumber:min(curNumber+6, len(wordSet.Words))],
		HaveMore: haveMore,
	}
	fmt.Println(response)
	err = writeDataJson(w, response)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "未知錯誤 請重試"})
	}
}

// 處理query words for full wordCard
func handleGetWords(w http.ResponseWriter, r *http.Request) {
	wordSetID := r.PathValue("wordSetID")
	wordSet, err := getWordSetByID(wordSetID)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: err.Error()})
		return
	}
	res := Type.FullWordCardType{
		ID:wordSet.ID,
		Title: wordSet.Title,
		Words: wordSet.Words,
		ShouldSwap: wordSet.ShouldSwap,
	}
	err = writeDataJson(w, res)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "未知錯誤 請重試"})
	}
}

// 處理editWordSet所傳來的變更
func UpdateWordSet(request Type.EditWordSetRequest) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	session, err := DB.Client.StartSession()
	if err != nil {
		return "", fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		if err := session.StartTransaction(); err != nil {
			return fmt.Errorf("failed to start transaction: %w", err)
		}

		collection := DB.Client.Database("go-quizlet").Collection("wordSets")
		filter := bson.M{"id": request.WordSet.ID}

		// ----------------------------
		// Step 1: Add new words
		// ----------------------------
		for i := range len(request.AddWords) {
			v := strings.TrimSpace(request.AddWords[i].Vocabulary)
			request.AddWords[i].Vocabulary = v
			// 檢查單字
			if len(v) == 0 || len(v) > Consts.MaxVocabularyLen {
				session.AbortTransaction(sc)
				return fmt.Errorf("單字字數不得為0或超過100")
			}
			// 檢查註釋
			d := strings.TrimSpace(request.AddWords[i].Definition)
			request.AddWords[i].Definition = d
			if len(d) == 0 || len(d) > Consts.MaxDefinitionLen {
				session.AbortTransaction(sc)
				return fmt.Errorf("註釋字數不得為0或超過300")
			}
			// 檢查單字聲音格式
			if err := utils.IsValidSound(request.AddWords[i].VocabularySound); err != nil {
				session.AbortTransaction(sc)
				return err
			}
			// 檢查註釋聲音格式
			if err := utils.IsValidSound(request.AddWords[i].DefinitionSound); err != nil {
				session.AbortTransaction(sc)
				return err
			}
		}
		if len(request.AddWords) > 0 {
			addUpdate := bson.M{
				"$push": bson.M{"words": bson.M{"$each": request.AddWords}},
			}
			if _, err := collection.UpdateOne(sc, filter, addUpdate); err != nil {
				session.AbortTransaction(sc)
				return fmt.Errorf("failed to update added words: %w", err)
			}
		}

		// ----------------------------
		// Step 2: Edit existing fields and words
		// ----------------------------
		setFields := bson.M{}

		// Validate and update top-level fields (title, description, shouldSwap)
		if title, ok := request.WordSet.Title.(string); ok {
			if title != "" {
				if len(title) > Consts.MaxTitleLen {
					session.AbortTransaction(sc)
					return errors.New("標題字數不得為0或超過50字元")
				}
				setFields["title"] = title
			}
		}
		if description, ok := request.WordSet.Description.(string); ok {
			if len(description) > Consts.MaxDescriptionLen {
				session.AbortTransaction(sc)
				return errors.New("敘述字數不得超過150字元")
			}
			setFields["description"] = description
		}
		setFields["updatedAt"] = utils.GetNow()
		setFields["shouldSwap"] = request.WordSet.ShouldSwap

		// Prepare array filters for updating existing words
		// Ensure arrayFilters and setFields are in sync
		arrayFilters := []interface{}{}

		for i, word := range request.WordSet.Words {
			elemIdentifier := fmt.Sprintf("elem%d", i)
			updated := false

			if word.Vocabulary != "" {
				setFields[fmt.Sprintf("words.$[%s].vocabulary", elemIdentifier)] = word.Vocabulary
				updated = true
			}
			if word.Definition != "" {
				setFields[fmt.Sprintf("words.$[%s].definition", elemIdentifier)] = word.Definition
				updated = true
			}
			if word.VocabularySound != "" {
				setFields[fmt.Sprintf("words.$[%s].vocabularySound", elemIdentifier)] = word.VocabularySound
				updated = true
			}
			if word.DefinitionSound != "" {
				setFields[fmt.Sprintf("words.$[%s].definitionSound", elemIdentifier)] = word.DefinitionSound
				updated = true
			}
			if word.Order != 0 {
				setFields[fmt.Sprintf("words.$[%s].order", elemIdentifier)] = word.Order
				updated = true
			}

			// ✅ Only add array filter if a field was updated
			if updated {
				arrayFilters = append(arrayFilters, bson.D{{Key: elemIdentifier + ".id", Value: word.ID}})
			}
		}

		// ✅ Only run the update if there's something to change
		if len(setFields) > 0 {
			editUpdate := bson.M{"$set": setFields}
			updateOpts := options.Update().SetArrayFilters(options.ArrayFilters{Filters: arrayFilters})

			res, err := collection.UpdateOne(sc, filter, editUpdate, updateOpts)
			if err != nil {
				session.AbortTransaction(sc)
				return fmt.Errorf("failed to update edited fields: %w", err)
			}
			if res.MatchedCount == 0 {
				session.AbortTransaction(sc)
				return errors.New("no matched wordSet for editing")
			}
		}


		// ----------------------------
		// Step 3: Remove words
		// ----------------------------
		if len(request.RemoveWords) > 0 {
			removeUpdate := bson.M{
				"$pull": bson.M{"words": bson.M{"id": bson.M{"$in": request.RemoveWords}}},
			}
			if _, err := collection.UpdateOne(sc, filter, removeUpdate); err != nil {
				session.AbortTransaction(sc)
				return fmt.Errorf("failed to update removed words: %w", err)
			}
		}

		// ----------------------------
		// Step 4: Update wordCnt
		// ----------------------------
		newWordCnt := len(request.WordSet.Words) + len(request.AddWords) - len(request.RemoveWords)
		wordCntUpdate := bson.M{"$set": bson.M{"wordCnt": newWordCnt}}

		if _, err := collection.UpdateOne(sc, filter, wordCntUpdate); err != nil {
			session.AbortTransaction(sc)
			return fmt.Errorf("failed to update word count: %w", err)
		}

		return session.CommitTransaction(sc)
	})
	if err != nil {
		return "", fmt.Errorf("failed to update word set: %w", err)
	}
	return "", nil
}

// 處裡刪除wordSet
func deleteWordSet(request Type.DeleteWordSetRequest) (string, error) {
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	// Correct filter
	filter := bson.M{"id": request.WordSetID}
	deletingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := coll.DeleteOne(deletingContext, filter)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤")
		}
		log.Println("deleteWordSet error", err.Error())
		return "", fmt.Errorf("伺服器出錯 請重試")
	}
	if res.DeletedCount == 0 {
		return "", errors.New("查無此單字集")
	}
	return "", nil
}

// 處理新增wordSet中的一個word
func addWord(request Type.AddWordRequest) (string, error) {
	request.Word.ID = utils.GenerateID()

	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	filter := bson.M{"id":request.WordSetID}
	update := bson.M{
		"$push": bson.M{"words": request.Word},
		"$inc": bson.M{"wordCnt": 1},
	}
	// Context and timeout for the update operation
	updateContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	res, err := coll.UpdateOne(updateContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤")
		}
		log.Println("addWord error", err.Error())
		return "", fmt.Errorf("伺服器出錯 請重試")
	}

	if res.ModifiedCount == 0 {
		return "", errors.New("查無此單字集")
	}

	return request.Word.ID, nil
}

// 處裡刪除wordSet中的一個word
func deleteWord(request Type.DeleteWordRequest) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	session, err := DB.Client.StartSession()
	if err != nil {
		return "", errors.New("無法啟動資料庫會話，請重試")
	}
	defer session.EndSession(ctx)

	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		coll := DB.Client.Database("go-quizlet").Collection("wordSets")
		// Correct filter
		filter := bson.M{"id": request.WordSetID}

		// First, pull the element
		pullUpdate := bson.M{
			"$pull": bson.M{"words": bson.M{"id": request.WordID}},
		}


		// Execute the pull operation
		res, err := coll.UpdateOne(sc, filter, pullUpdate)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				session.AbortTransaction(sc)
				return errors.New("超時錯誤")
			}
			log.Println("deleteWord error in deleting", err.Error())
			session.AbortTransaction(sc)
			return errors.New("伺服器錯誤 請重試")
		}

		// 就算沒有對應的wordID 他一樣不會變0，所以如果是0就代表是沒有對應的wordSetID
		if res.MatchedCount == 0 {
			session.AbortTransaction(sc)
			return errors.New("查無此單字集")
		}

		// Then fetch the document to get the words array length
		var doc bson.M
		err = coll.FindOne(sc, filter).Decode(&doc)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				session.AbortTransaction(sc)
				return errors.New("超時錯誤")
			}
			log.Println("deleteWord error in querying Words array", err.Error())
			session.AbortTransaction(sc)
			return errors.New("伺服器錯誤 請重試")
		}

		// Calculate the new count
		words, ok := doc["words"].(primitive.A)
		wordCount := 0
		if ok {
			wordCount = len(words)
		}

		// Update the count
		countUpdate := bson.M{
			"$set": bson.M{"wordCnt": wordCount},
		}
		_, err = coll.UpdateOne(sc, filter, countUpdate)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				session.AbortTransaction(sc)
				return errors.New("超時錯誤")
			}
			log.Println("deleteWord error in updating wordCnt", err.Error())
			session.AbortTransaction(sc)
			return errors.New("伺服器錯誤 請重試")
		}

		// Commit transaction
		if err := session.CommitTransaction(sc); err != nil {
			fmt.Println(err)
			return errors.New("交易提交失敗 請重試")
		}

		return nil
	})
	
	if err != nil {
		return "", err
	}

	return "", nil
}

// 處理toggle word中的star
func toggleWordStar(request Type.ToggleWordStarRequest) (string, error) {
	wordSet, err := getWordSetByID(request.WordSetID)
	if err != nil {
		return "", err
	}
	var newStar bool 
	for _, word := range wordSet.Words {
		if word.ID == request.WordID {
			newStar = !word.Star
		}
	} 

	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	updateContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{"id": request.WordSetID, "words.id": request.WordID}
	update := bson.M{
		"$set": bson.M{
			"words.$.star": newStar,
		},
	}
	res, err := coll.UpdateOne(updateContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤")
		}
		log.Println("toggleWordStar error", err.Error())
		return "", fmt.Errorf("伺服器錯誤 請重試")
	}

	if res.ModifiedCount == 0 {
		return "", errors.New("查無此單字或單字集")
	}

	return "", nil
}

func toggleAllWordStar(request Type.ToggleAllWordStarRequest) (string, error) {
	wordSetColl := DB.Client.Database("go-quizlet").Collection("wordSets")
	filter := bson.M{"id": request.WordSetID}
	update := bson.M{
		"$set": bson.M{
			"words.$[].star": request.NewStar,
		},
	}

	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	res, err := wordSetColl.UpdateMany(writingContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		return "", err
	}

	if res.MatchedCount == 0 {
		return "", errors.New("找不到單字集或單字")
	}

	log.Println("Successfully toggled star for all words!")
	return "", nil
}

// 處理inline/bigWordCard編輯單字和註釋
func inlineUpdateWord(request Type.InlineUpdateWordRequest) (string, error) {
	if request.NewVocabulary == "" || len(request.NewVocabulary) > Consts.MaxVocabularyLen {
		return "", errors.New("單字長度不得為空且不得超過100字元")
	}
	if request.NewDefinition == "" || len(request.NewDefinition) > Consts.MaxDefinitionLen {
		return "", errors.New("註釋長度不得為空且不得超過300字元")
	}
    collection := DB.Client.Database("go-quizlet").Collection("wordSets")
    
    // Now perform the update
    updateFilter := bson.M{
        "id": request.WordSetID,
        "words.id": request.WordID,
    }
    
    update := bson.M{
        "$set": bson.M{
            "words.$.vocabulary": request.NewVocabulary,
            "words.$.definition": request.NewDefinition,
        },
    }
    
    writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    res, err := collection.UpdateOne(writingContext, updateFilter, update)
    if err != nil {
		log.Println("inlineUpdateWord error", err.Error())
        return "", fmt.Errorf("伺服器錯誤 請重試")
    }
    
    if res.MatchedCount == 0 {
        return "", fmt.Errorf("查無此單字或單字集")
    }

	if res.ModifiedCount == 0 {
		fmt.Println("no update made, same word!")
	}
    
    return "", nil
}
// bigWordCard編輯單字和註釋
func bigWordCardUpdateWord(request Type.BigWordCardUpdateWordRequest) (string, error) {
	if request.NewVocabulary == "" || len(request.NewVocabulary) > Consts.MaxVocabularyLen {
		return "", errors.New("單字長度不得為空且不得超過100字元")
	}
	if request.NewDefinition == "" || len(request.NewDefinition) > Consts.MaxDefinitionLen {
		return "", errors.New("註釋長度不得為空且不得超過300字元")
	}
	if err := utils.IsValidSound(request.NewVocabularySound); err != nil {
		return "", err
	}
	if err := utils.IsValidSound(request.NewDefinitionSound); err != nil {
		return "", err
	}
    collection := DB.Client.Database("go-quizlet").Collection("wordSets")
    
    // Now perform the update
    updateFilter := bson.M{
        "id": request.WordSetID,
        "words.id": request.WordID,
    }
    
    update := bson.M{
        "$set": bson.M{
            "words.$.vocabulary": request.NewVocabulary,
            "words.$.definition": request.NewDefinition,
            "words.$.vocabularySound": request.NewVocabularySound,
            "words.$.definitionSound": request.NewDefinitionSound,
        },
    }
    
    writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    res, err := collection.UpdateOne(writingContext, updateFilter, update)
    if err != nil {
		log.Println("inlineUpdateWord error", err.Error())
        return "", fmt.Errorf("伺服器錯誤 請重試")
    }
    
    if res.MatchedCount == 0 {
        return "", fmt.Errorf("查無此單字或單字集")
    }

	if res.ModifiedCount == 0 {
		fmt.Println("no update made, same word!")
	}
    
    return "", nil
}

// 處理儲存wordSet(給wordSet加星號)
func toggleLikeWordSet(request Type.ToggleLikeWordSetRequest) (string, error) {
	// 先比對是否使用者為wordSet Author
	wordSet, err := getWordSetByID(request.WordSetID)
	if err != nil {
		return "", err
	}
	if wordSet.AuthorID == request.UserID {
		return "", errors.New("操作錯誤 你為此單字集作者")
	}

	// Create a single timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get user & author
	userColl := DB.Client.Database("go-quizlet").Collection("users")
	filter := bson.M{"id": bson.M{"$in": []string{request.UserID, wordSet.AuthorID}}}

	cursor, err := userColl.Find(ctx, filter)
	if err != nil {
		return "", errors.New("未知錯誤 請重試")
	}
	defer cursor.Close(ctx)

	// Parse results
	var users []Type.User
	err = cursor.All(ctx, &users)
	if err != nil {
		return "", errors.New("未知錯誤 請重試")
	}
	if len(users) < 2 {
		return "", errors.New("未找到所有用戶")
	}

	// Fix: Correctly map user IDs
	userMap := make(map[string]Type.User)
	for _, user := range users {
		userMap[user.ID] = user
	}
	user, author := userMap[request.UserID], userMap[wordSet.AuthorID]

	// Start a transaction session
	session, err := DB.Client.StartSession()
	if err != nil {
		return "", errors.New("無法啟動資料庫會話，請重試")
	}
	defer session.EndSession(ctx)

	// Execute transaction
	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		if err := session.StartTransaction(); err != nil {
			return errors.New("無法啟動交易 請重試")
		}

		var userUpdates []mongo.WriteModel
		var wordSetUpdates []mongo.WriteModel
		wordSetColl := DB.Client.Database("go-quizlet").Collection("wordSets")

		if slices.Contains(user.LikedWordSets, request.WordSetID) {
			// 移除 liked wordSet
			userUpdates = []mongo.WriteModel{
				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": user.ID}).
					SetUpdate(bson.M{"$pull": bson.M{"likedWordSets": request.WordSetID}}),

				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": author.ID}).
					SetUpdate(bson.M{"$inc": bson.M{"likedCnt": -1}}),
			}
			wordSetUpdates = []mongo.WriteModel{
				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": request.WordSetID}).
					SetUpdate(bson.M{"$pull": bson.M{"likedUsers": user.ID}}),

				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": request.WordSetID}).
					SetUpdate(bson.M{"$inc": bson.M{"likes": -1}}),
			}
		} else {
			// 新增 liked wordSet
			userUpdates = []mongo.WriteModel{
				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": user.ID}).
					SetUpdate(bson.M{"$push": bson.M{"likedWordSets": request.WordSetID}}),

				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": author.ID}).
					SetUpdate(bson.M{"$inc": bson.M{"likedCnt": 1}}),
			}
			wordSetUpdates = []mongo.WriteModel{
				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": request.WordSetID}).
					SetUpdate(bson.M{"$push": bson.M{"likedUsers": user.ID}}),

				mongo.NewUpdateOneModel().
					SetFilter(bson.M{"id": request.WordSetID}).
					SetUpdate(bson.M{"$inc": bson.M{"likes": 1}}),
			}
		}

		res, err := userColl.BulkWrite(sc, userUpdates, options.BulkWrite().SetOrdered(false))
		if err != nil {
			session.AbortTransaction(sc)
			return errors.New("資料寫入錯誤 請重試")
		}
		if res.MatchedCount == 0 {
			session.AbortTransaction(sc)
			return errors.New("查無使用者")
		}

		// Update word set
		wordSetRes, err := wordSetColl.BulkWrite(sc, wordSetUpdates, options.BulkWrite().SetOrdered(false))
		if err != nil {
			session.AbortTransaction(sc)
			return errors.New("資料寫入錯誤 請重試")
		}
		if wordSetRes.MatchedCount == 0 {
			session.AbortTransaction(sc)
			return errors.New("查無單字集")
		}

		// Commit transaction
		if err := session.CommitTransaction(sc); err != nil {
			fmt.Println(err)
			return errors.New("交易提交失敗 請重試")
		}

		log.Println("toggle wordSet star succeeds!")
		return nil
	})

	if err != nil {
		return "", err
	}

	return "", nil
}


func ForkWordSet(request Type.ForkWordSetRequest) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	session, err := DB.Client.StartSession()
	if err != nil {
		return "", errors.New("資料庫錯誤 請重試")
	}
	defer session.EndSession(ctx)

	// Run transaction function
	err = mongo.WithSession(ctx, session, func(sc mongo.SessionContext) error {
		// Start transaction
		if err := session.StartTransaction(); err != nil {
			return errors.New("資料庫錯誤 請重試")
		}

		wordSet, err := getWordSetByID(request.WordSetID)
		if err != nil {
			session.AbortTransaction(sc)
			return err
		}

		if wordSet.AllowCopy == false {
			session.AbortTransaction(sc)
			return errors.New("此單字集拒絕複製")
		}

		// 確認是否是作者本人，否就給原作者credit
		userColl := DB.Client.Database("go-quizlet").Collection("users")
		if request.UserID != wordSet.AuthorID {
			author, err := getUserByID(wordSet.AuthorID)
			if err != nil {
				session.AbortTransaction(sc)
				return err
			}
	
			filter := bson.M{"id": author.ID}
			update := bson.M{"$inc": bson.M{"forkCnt": 1}}
	
			res, err := userColl.UpdateOne(sc, filter, update)
			if err != nil {
				session.AbortTransaction(sc)
				return errors.New("寫入錯誤 請重試")
			}
			if res.MatchedCount == 0 {
				session.AbortTransaction(sc)
				return errors.New("找不到使用者 請重試")
			}
		}

		// 重新產生一個wordSet 並替換createdAt, updatedAt以及AuthorID和LikeUsers和Likes
		var newWordSet Type.WordSet
		data, _ := json.Marshal(wordSet)     // Convert to JSON
		json.Unmarshal(data, &newWordSet)    // Convert back to struct
		
		// Overwrite fields
		newWordSetID := utils.GenerateID()
		newWordSet.ID = newWordSetID
		newWordSet.AuthorID = request.UserID
		newWordSet.CreatedAt = utils.GetTodayFormatted()
		newWordSet.UpdatedAt = utils.GetNow()
		newWordSet.LikedUsers = []string{}
		newWordSet.Likes = 0
		newWordSet.AllowCopy = true
		newWordSet.IsPublic = true

		wordSetColl := DB.Client.Database("go-quizlet").Collection("wordSets")
		_, err = wordSetColl.InsertOne(sc, newWordSet)
		if err != nil {
			session.AbortTransaction(sc)
			return errors.New("寫入錯誤 請重試")
		}

		// wordSetID 寫入到 user 的 CreatedWordSets 陣列
		filter := bson.M{"id": request.UserID}
		update := bson.M{"$push": bson.M{"createdWordSets": newWordSetID}}

		res, err := userColl.UpdateOne(sc, filter, update)
		if err != nil {
			session.AbortTransaction(sc) // 交易失敗時回滾
			if errors.Is(err, context.DeadlineExceeded) {
				return errors.New("超時錯誤 請重試")
			}
			return err
		}
		if res.MatchedCount == 0 {
			session.AbortTransaction(sc)
			return errors.New("查無使用者")
		}

		// Commit transaction if all operations succeed
		if err := session.CommitTransaction(sc); err != nil {
			return errors.New("交易提交失敗 請重試")
		}

		log.Println("fork succeeds!")
		return nil
	})

	if err != nil {
		return "", err
	}

	return "", nil
}


// 處理Lib Page
func getWordSetsInLib(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userID")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	// Step 1: Find user
	user, err := getUserByID(userID)
	if err != nil {
		writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusNotFound, Message: err.Error()})
		return
	}
	
	// Step 2: Find created word sets
	wordSetsColl := DB.Client.Database("go-quizlet").Collection("wordSets")
	created := []Type.WordSet{}
	if len(user.CreatedWordSets) > 0 {
		createdFilter := bson.M{"id": bson.M{"$in": user.CreatedWordSets}}
		cursor, err := wordSetsColl.Find(ctx, createdFilter)
		if err != nil {
			writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "查詢錯誤"})
			return
		}
		defer cursor.Close(ctx)

		if err := cursor.All(ctx, &created); err != nil {
			writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "解碼錯誤"})
			return
		}
	}

	// Convert to display format
	createdWordSets := make([]Type.LibWordSetDisplay, len(created))
	for i, wordSet := range created {
		createdWordSets[i] = Type.LibWordSetDisplay{
			ID:        wordSet.ID,
			Title:     wordSet.Title,
			AuthorID:  wordSet.AuthorID,
			CreatedAt: wordSet.CreatedAt,
			UpdatedAt: wordSet.UpdatedAt,
			WordCnt:   wordSet.WordCnt,
		}
	}

	// Step 3: Find liked word sets
	liked := []Type.WordSet{}
	if len(user.LikedWordSets) > 0 {
		likedFilter := bson.M{"id": bson.M{"$in": user.LikedWordSets}}
		cursor, err := wordSetsColl.Find(ctx, likedFilter)
		if err != nil {
			writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "查詢錯誤"})
			return
		}
		defer cursor.Close(ctx)

		if err := cursor.All(ctx, &liked); err != nil {
			writeErrorJson(w, Type.PageDisplayError{StatusCode: http.StatusInternalServerError, Message: "解碼錯誤"})
			return
		}
	}

	// Convert to display format
	likedWordSets := make([]Type.LibWordSetDisplay, len(liked))
	for i, wordSet := range liked {
		likedWordSets[i] = Type.LibWordSetDisplay{
			ID:        wordSet.ID,
			Title:     wordSet.Title,
			AuthorID:  wordSet.AuthorID,
			CreatedAt: wordSet.CreatedAt,
			UpdatedAt: wordSet.UpdatedAt,
			WordCnt:   wordSet.WordCnt,
		}
	}

	response := Type.LibPage{
		User: Type.LibUser{
			ID:userID,
			Role:user.Role,
			Name:user.Name,
			Img:user.Img,
			CreatedAt: user.CreatedAt,
			LikeCnt: user.LikedCnt,
			ForkCnt: user.ForkedCnt,
		},
		CreatedWordSets: createdWordSets,
		LikedWordSets: likedWordSets,
	}

	writeDataJson(w, response)
}

// Change User Image
func changeUserImage(w http.ResponseWriter, r *http.Request) {
	// 先檢查使用者是否登入以及JWT是否過期了
	token, err := utils.CheckLogIn(w, r)
	if err != nil {
		fmt.Println("User not log in! Exit the post handler")
		CallToLogInJson(w, Type.MessageDisplayError{Message: "使用者未登入! 或憑證已過期!"})
		return
	}
	
	// 從JWT中取出userID
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
		return
	}
	userID, ok := claims["userID"].(string)
	if !ok {
		writeErrorJson(w, Type.MessageDisplayError{Message: "憑證錯誤"})
		return
	}
	
	// Limit upload size
	r.Body = http.MaxBytesReader(w, r.Body, int64(Consts.MaxUploadSize))
	defer r.Body.Close()

	// Parse multipart form
	err = r.ParseMultipartForm(int64(Consts.MaxUploadSize))
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "檔案超過上限(最多10MB)"})
		return
	}

	// 比對request的userID是否一致
	id := r.FormValue("userID")
	if id != userID {
		writeErrorJson(w, Type.MessageDisplayError{Message: "使用者無權限變更"})
		return
	}

	// Get the file from form data
	file, _, err := r.FormFile("image")
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "檔案格式錯誤"})
		return
	}
	defer file.Close()

	// Upload to Imgur
	imgurResp, err := utils.UploadToImgur(file, "profile image")
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "圖片上傳錯誤 請重試"})
		return
	}
	fmt.Println(imgurResp)
	if !imgurResp.Success {
		writeErrorJson(w, Type.MessageDisplayError{Message: "圖片上傳遭拒 請重試"})
		return
	}

	// write new image link to DB
	coll := DB.Client.Database("go-quizlet").Collection("users")
	filter := bson.M{"id":userID}
	update := bson.M{"$set": bson.M{"img": imgurResp.Data.Link}} 
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := coll.UpdateOne(writingContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "寫入超時 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}
	if res.MatchedCount == 0 {
		writeErrorJson(w, Type.MessageDisplayError{Message: "查無使用者"})
		return
	}
	writeDataJson(w, imgurResp.Data.Link)
}

// Change User Name
func changeUserName(request Type.ChangeUserNameRequest) (string, error) {
	// 判斷名稱是否合法
	newName := strings.TrimSpace(request.NewName)
	if len(newName) == 0 {
		return "", errors.New("名稱不得為空")
	}
	if len(newName) > 12 {
		return "", errors.New("名稱不得超過12個字元")
	}
	if newName == Consts.ADMINNAME {
		return "", errors.New(fmt.Sprintf("使用者名稱不得為%s", Consts.ADMINNAME))
	}
	if !utils.IsValidName(newName) {
		return "", errors.New("使用者名稱只能包含英文、數字、底線")
	}

	coll := DB.Client.Database("go-quizlet").Collection("users")
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{"id":request.UserID}
	update := bson.M{"$set":bson.M{"name":newName}}
	res, err := coll.UpdateOne(writingContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", errors.New("查無使用者")
		}
		log.Println("changeUserName error", err.Error())
		return "", errors.New("伺服器錯誤 請重試")
	}
	if res.ModifiedCount == 0 {
		log.Println("no update made, the same user name!")
	}

	return "", nil
}

// Change User Email
func changeUserEmail(request Type.ChangeUserEmailRequest) (string, error) {
	// 判斷email是否合法
	newEmail := strings.TrimSpace(request.NewEmail)
	if !utils.IsValidEmail(newEmail) {
		return "", errors.New("email格式不合法")
	}

	// 找出是否有驗證過
	var record Type.ResetAccountORPassword
	resetAccountColl := DB.Client.Database("go-quizlet").Collection("resetAccount")
	filter := bson.M{"email":request.NewEmail}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err := resetAccountColl.FindOne(findingContext, filter).Decode(&record)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", errors.New("該電子郵件尚未驗證")
		}
		log.Println("changeUserEmail error 1", err.Error())
		return "", errors.New("伺服器錯誤 請重試")
	}

	// 檢查驗證碼是否正確
	if !utils.CheckHashedPassword(request.ValidateCode, record.ValidateCode) {
		return "", errors.New("驗證碼錯誤")
	}
	// 檢查是否過期
	if utils.GetNow() > record.Expire {
		return "", errors.New("驗證碼過期 請重新申請")
	}

	coll := DB.Client.Database("go-quizlet").Collection("users")
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter = bson.M{"id":request.UserID}
	update := bson.M{"$set":bson.M{"email":newEmail}}
	res, err := coll.UpdateOne(writingContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			return "", errors.New("查無使用者")
		}
		log.Println("changeUserEmail error 2", err.Error())
		return "", errors.New("伺服器錯誤 請重試")
	}
	if res.ModifiedCount == 0 {
		log.Println("no update made, the same user email!")
	}

	// 刪除修改的請求紀錄
	result, err := resetAccountColl.DeleteOne(writingContext, bson.M{"email": request.NewEmail})
	if err != nil {
		log.Println("error when deleting record from resetAccount:", err)
	} else if result.DeletedCount == 0 {
		log.Println("no document found with that email")
	}

	return "", nil
}

func getMails(userID string) ([]Type.MailViewType, error) {
	user, err := getUserByID(userID)	
	if err != nil {
		return nil, err
	}

	var mails []Type.MailViewType
	mailColl := DB.Client.Database("go-quizlet").Collection("mails")
	filter := bson.M{"id":bson.M{"$in":user.Mails}}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := mailColl.Find(findingContext, filter)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, errors.New("超時錯誤 請重試")
		}
		return nil, errors.New("查詢錯誤 請重試")
	}
	if err := cursor.All(findingContext, &mails); err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, errors.New("超時錯誤 請重試")
		}
		return nil, errors.New("轉換錯誤 請重試")
	}
	return mails, nil
}

func getUnreadMailsCnt(userID string) (int, error) {
	user, err := getUserByID(userID)	
	if err != nil {
		return 0, err
	}

	var mails []Type.MailViewType
	mailColl := DB.Client.Database("go-quizlet").Collection("mails")
	filter := bson.M{"id":bson.M{"$in":user.Mails}}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := mailColl.Find(findingContext, filter)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return 0, errors.New("超時錯誤 請重試")
		}
		return 0, errors.New("查詢錯誤 請重試")
	}
	if err := cursor.All(findingContext, &mails); err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return 0, errors.New("超時錯誤 請重試")
		}
		return 0, errors.New("轉換錯誤 請重試")
	}
	// 算未讀信件數量
	var cnt int
	for _, mail := range mails {
		if mail.Read == false {
			cnt+=1
		}
	}
	return cnt, nil
}

func readMail(request Type.ReadMailRequest) (string, error) {
	coll := DB.Client.Database("go-quizlet").Collection("mails")
	filter := bson.M{"id":request.MailID}
	update := bson.M{"$set":bson.M{"read":true}}
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := coll.UpdateOne(writingContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		return "", errors.New("資料庫錯誤 請重試")
	}
	if res.MatchedCount == 0 {
		return "", errors.New("查無該信件")
	}
	
	return "", nil
}

func addRecentVisit(request Type.AddRecentVisitRequest) (string, error) {
	recentVisit, err := getRecentVisitByID(request.UserID)
	if err != nil  {
		return "", err
	}
	newRecord := make([]string, 0, 4) 
	newRecord = append(newRecord, request.WordSetID)
	maxLoop := min(4, len(recentVisit.Record))
	if index := slices.Index(recentVisit.Record, request.WordSetID); index == -1 && maxLoop == 4 {
		maxLoop-=1
	} 
	for index := range maxLoop {
		visitID := recentVisit.Record[index]
		if visitID == request.WordSetID {
			continue
		}
		newRecord = append(newRecord, visitID)
	}
	
	// 更新recentVisit
	coll := DB.Client.Database("go-quizlet").Collection("recentVisit")
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	filter := bson.M{"id":request.UserID}
	update := bson.M{"$set":bson.M{"record":newRecord}}
	_, err = coll.UpdateOne(writingContext, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		return "", errors.New("未知錯誤 請重試")
	}
	return "", nil
}

func getRecentVisit(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userID")
	recentVisit, err := getRecentVisitByID(userID)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return 
	}
	record := make([]Type.HomePageWordSet, 0, 4)
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	filter := bson.M{"id":bson.M{"$in":recentVisit.Record}}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := coll.Find(findingContext, filter)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return
	}
	if err = cursor.All(findingContext, &record); err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "資料轉換錯誤 請重試"})
		return
	}
	// 依照recentVisit的record裡的id進行排序
	// 先創造對應順序的map
	indexMap := make(map[string]int)
	for i, id := range recentVisit.Record {
		indexMap[id] = i
	}
	// 開始排序
	sort.Slice(record, func(i, j int) bool {
		return indexMap[record[i].ID] < indexMap[record[j].ID]
	})

	response := Type.RecentVisitResponse{
		Record: record,
	}
	err = writeDataJson(w, response)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
	}
}

func getNewWordSet(w http.ResponseWriter, r *http.Request) {
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 找出最新的前6
	filter := bson.M{"isPublic":true}
	newOption := options.Find()
	// 因為comparison rule的順序是重要的，所以用bson.D而不是bson.M
	newOption.SetSort(bson.D{{Key: "createdAt",Value: -1}, {Key:"updatedAt",Value:-1}}) // 如果createdAt一樣，就比updatedAt
	newOption.SetLimit(6)
	cursor, err := coll.Find(findingContext, filter, newOption)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return
	}
	newWordSet := make([]Type.HomePageWordSet, 0, 6)
	if err = cursor.All(findingContext, &newWordSet); err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "轉換錯誤 請重試"})
		return
	}
	
	response := Type.NewWordSetResponse{
		NewWordSet: newWordSet,
	}
	err = writeDataJson(w, response)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
	}
}

func getPopularWordSet(w http.ResponseWriter, r *http.Request) {
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 找出最熱門的(喜歡)前6
	filter := bson.M{"isPublic":true}
	popularOption := options.Find()
	popularOption.SetSort(bson.M{"likes":-1})
	popularOption.SetLimit(6)
	cursor, err := coll.Find(findingContext, filter, popularOption)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return
	}
	popularWordSet := make([]Type.HomePageWordSet, 0, 6)
	if err = cursor.All(findingContext, &popularWordSet); err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "轉換錯誤 請重試"})
		return
	}

	response := Type.PopularWordSetResponse{
		PopularWordSet: popularWordSet,
	}
	err = writeDataJson(w, response)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
	}
}

func getFeedback(w http.ResponseWriter, r *http.Request) {
	curNumber := r.URL.Query().Get("curNumber")
	if curNumber == "" {
		writeErrorJson(w, Type.MessageDisplayError{Message: "搜尋值為空"})
		return
	}
	start, err := strconv.Atoi(curNumber)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "搜尋值錯誤"})
		return
	}
	// 雖然一次最多拿MaxDataFetch的數量，但要更有效率的察看是否還有多的資料
	// ✅ Efficient Pattern: Fetch limit + 1 Documents
	feedbacks := make([]Type.Feedback, 0, Consts.MaxDataFetch+1) 
	coll := DB.Client.Database("go-quizlet").Collection("feedbacks")
	feedbackOption := options.Find()
	feedbackOption.SetSort(bson.M{"createdAt": -1})
	feedbackOption.SetLimit(int64(Consts.MaxDataFetch+1))
	feedbackOption.SetSkip(int64(start))
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := coll.Find(findingContext, bson.M{}, feedbackOption)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤"})
		return
	}
	if err = cursor.All(findingContext, &feedbacks); err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "格式轉換錯誤"})
		return
	}
	haveMore := len(feedbacks) > Consts.MaxDataFetch
	if haveMore {
		feedbacks = feedbacks[:Consts.MaxDataFetch] // 不取最後一個
	}
	response := Type.FeedbackResponse{
		Feedbacks: feedbacks, 
		HaveMore: haveMore,
	}
	err = writeDataJson(w, response)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
	}
}

func createFeedback(request Type.CreateFeedbackRequest) (string, error) {
	if len(request.Title) == 0 {
		return "", errors.New("回饋建議的標題不得為空")
	}
	if len(request.Title) > Consts.MaxTitleLen {
		return "", errors.New(fmt.Sprintf("回饋建議的標題不得超過%d個字", Consts.MaxTitleLen))
	}

	if len(request.Content) == 0 {
		return "", errors.New("回饋建議的內容不得為空")
	}
	if len(request.Content) > Consts.MaxContentLen {
		return "", errors.New(fmt.Sprintf("回饋建議的內容不得超過%d個字", Consts.MaxContentLen))
	}
	
	// 對feedback加上ID和日期
	feedback := Type.Feedback{
		ID:utils.GenerateID(),
		AuthorID: request.AuthorID,
		Title:request.Title,
		Content:request.Content,
		CreatedAt: utils.GetNow(),
		FormattedCreatedAt: utils.GetTodayFormatted(),
	}
	coll := DB.Client.Database("go-quizlet").Collection("feedbacks")
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := coll.InsertOne(writingContext, feedback)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
		return "", errors.New("超時錯誤 請重試")
		}
		return "", errors.New("未知錯誤 請重試")
	}

	return "", nil
}

func toggleAllowCopy(request Type.ToggleAllowCopyRequest) (string, error) {
	wordSet, err := getWordSetByID(request.WordSetID)
	if err != nil {
		return "", err
	}
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	filter := bson.M{"id":request.WordSetID}
	update := bson.M{"$set":bson.M{"allowCopy":!wordSet.AllowCopy}}
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := coll.UpdateOne(writingContext, filter, update)
	if res.MatchedCount == 0 {
		return "", errors.New("查無單字集")
	} 
	
	return "", nil
}
func toggleIsPublic(request Type.ToggleIsPublicRequest) (string, error) {
	wordSet, err := getWordSetByID(request.WordSetID)
	if err != nil {
		return "", err
	}
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")
	filter := bson.M{"id":request.WordSetID}
	update := bson.M{"$set":bson.M{"isPublic":!wordSet.IsPublic}}
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res, err := coll.UpdateOne(writingContext, filter, update)
	if res.MatchedCount == 0 {
		return "", errors.New("查無單字集")
	} 

	return "", nil
}

func logError(request Type.LogErrorRequest) (string, error) {
	coll := DB.Client.Database("go-quizlet").Collection("errors")
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	errorData := Type.LogError{
		ID:utils.GenerateID(),
		UserID:request.UserID,
		ErrorID: request.ErrorID,
		Error:request.Error,
		ErrorInfo: request.ErrorInfo,
		Time: request.Time,
	}
	fmt.Println("errorID:", errorData)
	_, err := coll.InsertOne(writingContext, errorData)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "", errors.New("超時錯誤 請重試")
		}
		return "", errors.New("寫入錯誤")
	}

	return "", nil
}

func requestValidateCode(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("changeMode")
	if mode != "account" && mode != "password" {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請求格式錯誤"})
		return
	}
	var request Type.RequestValidateCodeRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	defer r.Body.Close()
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請求格式錯誤"})
		return
	}
	if err = validate.Struct(request); err != nil {
        // Handle validation error
        writeErrorJson(w, Type.MessageDisplayError{Message: "格式錯誤 缺少必要欄位"})
        return
    }
	// 檢查帳號格式
	if !utils.IsValidEmail(request.Email) {
		writeErrorJson(w, Type.MessageDisplayError{Message: "電子郵件格式錯誤"})
        return
	}
	// 檢查帳號是否存在
	var existingUser Type.User
	userColl := DB.Client.Database("go-quizlet").Collection("users")
	userFilter := bson.M{"email": request.Email}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = userColl.FindOne(findingContext, userFilter).Decode(&existingUser)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "此帳號不存在"})
			return 
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return 
	}
	if existingUser.IsGoogle {
		writeErrorJson(w, Type.MessageDisplayError{Message: "第三方登入帳戶不得更改密碼喔!"})
		return
	}
	// 檢查是否在驗證碼時效內有請求過
	var coll *mongo.Collection
	if mode == "account" {
		coll = DB.Client.Database("go-quizlet").Collection("resetAccount")
	} else {
		coll = DB.Client.Database("go-quizlet").Collection("resetPassword")
	}
	filter := bson.M{"email":request.Email}
	var record Type.ResetAccountORPassword 
	err = coll.FindOne(findingContext, filter).Decode(&record)
	if err != nil && err != mongo.ErrNoDocuments {
		writeErrorJson(w, Type.MessageDisplayError{Message: "資料庫查詢錯誤 請重試"})
		return 
	}
	if record.Expire > utils.GetNow() + int64(Consts.MinResendTimeBuffer) {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請勿在3分鐘內重複申請驗證碼"})
		return 
	}
	// 產生驗證碼(明碼)
	validateCode, err := utils.GenerateSixDigitCode()
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "驗證碼產生錯誤 請重試"})
		return 
	}
	// 寄出驗證碼至信箱
	var emailTitle string
	if mode == "account" {
		emailTitle = "更改帳號-驗證碼"
	} else {
		emailTitle = "更改密碼-驗證碼"
	}
	
	err = utils.SendEmailWithTimeout("template/ResetPassword.html", emailTitle, request.Email, strconv.Itoa(validateCode), 10*time.Second)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}
	// 把相關請求寫入DB或更新已存在的請求
	hashedValidateCode, err := utils.HashPassword(strconv.Itoa(validateCode))
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "驗證碼加密錯誤 請重試"})
		return 
	}
	data := Type.ResetAccountORPassword{
		Email: request.Email,
		ValidateCode: hashedValidateCode,
		Expire: utils.GetNow() + int64(Consts.ResetPasswordValidateCodeExpire),
	}
	
	// SetUpsert(true): inserts the new document if it doesn't exist.
	opts := options.Replace().SetUpsert(true)
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err = coll.ReplaceOne(writingContext, filter, &data, opts)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return 
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "寫入錯誤 請重試"})
		return 
	}
	
	writeDataJson(w, Type.MessageDisplaySuccess{Message: "驗證碼已寄出!"})
}

func resetPassword(w http.ResponseWriter, r *http.Request) {
	var resetPasswordRequest Type.ResetPasswordRequest
	err := json.NewDecoder(r.Body).Decode(&resetPasswordRequest) 
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "密碼更新請求格式錯誤"})
		return
	}
	if err = validate.Struct(resetPasswordRequest); err != nil {
        // Handle validation error
        writeErrorJson(w, Type.MessageDisplayError{Message: "格式錯誤 缺少必要欄位"})
        return
    }
	var existingUser Type.User
	userColl := DB.Client.Database("go-quizlet").Collection("users")
	userFilter := bson.M{"email": resetPasswordRequest.Email}
	findingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = userColl.FindOne(findingContext, userFilter).Decode(&existingUser)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "此帳號不存在"})
			return 
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return 
	}
	if existingUser.IsGoogle {
		writeErrorJson(w, Type.MessageDisplayError{Message: "第三方登入帳戶不得更改密碼喔!"})
		return
	}
	// 用驗證碼找出更改密碼的請求
	var resetPassword Type.ResetAccountORPassword
	resetPasswordColl := DB.Client.Database("go-quizlet").Collection("resetPassword")
	resetPasswordFilter := bson.M{"email":resetPasswordRequest.Email}
	err = resetPasswordColl.FindOne(findingContext, resetPasswordFilter).Decode(&resetPassword)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return 
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "查無驗證碼"})
			return 
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return 
	}
	
	if same := utils.CheckHashedPassword(resetPasswordRequest.ValidateCode, resetPassword.ValidateCode); !same {
		writeErrorJson(w, Type.MessageDisplayError{Message: "驗證碼錯誤"})
		return 
	}
	if resetPassword.Expire < utils.GetNow() {
		writeErrorJson(w, Type.MessageDisplayError{Message: "驗證碼失效"})
		return 
	}
	// 檢查密碼、確認密碼
	if err := utils.IsValidPassword(resetPasswordRequest.Password); err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return 
	}
	if resetPasswordRequest.Password != resetPasswordRequest.RePassword {
		writeErrorJson(w, Type.MessageDisplayError{Message: "兩次密碼輸入不一致"})
		return 
	}

	// 更改密碼
	hashedPassword, err := utils.HashPassword(resetPasswordRequest.Password)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "密碼轉換錯誤"})
		return 
	}
	writingContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	update := bson.M{"$set":bson.M{"password":hashedPassword}}
	_, err = userColl.UpdateOne(writingContext, userFilter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return 
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤 請重試"})
		return 
	}

	err = writeDataJson(w, Type.MessageDisplaySuccess{Message: "更改密碼成功"})
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
	}

	// 刪除驗證碼紀錄
	_, err = resetPasswordColl.DeleteOne(writingContext, resetPasswordFilter)
	if err != nil {
		log.Println("resetPassword deletion error", err)
	}
}

func sendActivationEmail(w http.ResponseWriter, r *http.Request) {
	var request Type.SendActivateEmailRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請求格式錯誤"})
		return
	}
	defer r.Body.Close()
	if !utils.IsValidEmail(request.Email) {
		writeErrorJson(w, Type.MessageDisplayError{Message: "電子郵件格式錯誤"})
		return
	}
	// 查找是否該電子郵件被註冊過
	coll := DB.Client.Database("go-quizlet").Collection("users")
	filter := bson.M{"email":request.Email}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	res := coll.FindOne(ctx, filter)
	if res.Err() == nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "該電子郵件已被註冊"})
		return
	}
	if res.Err() != nil && res.Err() != mongo.ErrNoDocuments {
		if res.Err() == context.DeadlineExceeded {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤"})
		return
	}	

	// 先看有無紀錄，如果有則找出record並檢查開通間隔
	var record Type.ActivateEmail
	activateEmailColl := DB.Client.Database("go-quizlet").Collection("activateEmail")
	err = activateEmailColl.FindOne(ctx, filter).Decode(&record)
	if err == nil {
		if record.Expire > utils.GetNow() + int64(Consts.MinActivateEmailExpire) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "請勿在3分鐘內重複請求"})
			return
		}
	} 
	if err != nil && err != mongo.ErrNoDocuments {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "查詢錯誤"})
	}

	// sending email activation link, with 10s timeout
	token := utils.GenerateID()
	sendingEmailErr := utils.SendEmailWithTimeout("template/activateEmail.html", "電子郵件開通驗證", request.Email, fmt.Sprintf("%s/activateEmail/%s", Consts.FrontendPATH, token), 10*time.Second)
	if sendingEmailErr != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: sendingEmailErr.Error()})
		return
	}
	// save record to the DB
	activateColl := DB.Client.Database("go-quizlet").Collection("activateEmail")
	filter = bson.M{"email": request.Email}
	opts := options.Replace().SetUpsert(true)
	data := Type.ActivateEmail{
		Email: request.Email,
		Token: token,
		Expire: utils.GetNow() + int64(Consts.ActivateEmailExpire),
		Activated: false,
	}
	_, err = activateColl.ReplaceOne(ctx, filter, &data, opts)
	if err != nil {
		if res.Err() == context.DeadlineExceeded {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "寫入錯誤"})
		return
	}

	writeDataJson(w, Type.MessageDisplaySuccess{Message: "開通郵件已寄出"})
}

func activateEmail(w http.ResponseWriter, r *http.Request) {
	var request Type.ActivateEmailRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	defer r.Body.Close()
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請求格式錯誤"})
	}
	if len(request.Token) != 36 { // length of uuid is 36
		writeErrorJson(w, Type.MessageDisplayError{Message: "權證錯誤"})
		return
	}

	var record Type.ActivateEmail
	coll := DB.Client.Database("go-quizlet").Collection("activateEmail")
	filter := bson.M{"token":request.Token}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = coll.FindOne(ctx, filter).Decode(&record)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "權證錯誤"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		return
	}
	// 查看是否過期
	if utils.GetNow() > record.Expire {
		writeErrorJson(w, Type.MessageDisplayError{Message: "權證過期"})
		return
	}
	if record.Activated {
		writeErrorJson(w, Type.MessageDisplayError{Message: "請勿重複驗證"})
		return
	}
	// 把該email變成activated，並修改expire限制5分鐘內完成註冊
	update := bson.M{"$set":bson.M{"activated":true, "expire":utils.GetNow() + int64(Consts.ActivatedEmailRegisterExpire)}}
	_, err = coll.UpdateOne(ctx, filter, update)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			writeErrorJson(w, Type.MessageDisplayError{Message: "超時錯誤 請重試"})
			return
		}
		writeErrorJson(w, Type.MessageDisplayError{Message: "寫入錯誤 請重試"})
		return
	}

	writeDataJson(w, Type.MessageDisplaySuccess{Message: "郵件開通成功 請關閉頁面~"})
}

/*
// 處理update word element的route
func handleUpdateWordElement(w http.ResponseWriter, r *http.Request) {
	var updateElement Type.UpdateWordElement
	err := json.NewDecoder(r.Body).Decode(&updateElement)
	defer r.Body.Close()
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "單字更新格式錯誤"})
		return
	}
	// validate
    if err = validate.Struct(updateElement); err != nil {
        // Handle validation error
        writeErrorJson(w, Type.MessageDisplayError{Message: "格式錯誤 缺少必要欄位"})
        return
    }
	err = updateWordElement(updateElement.WordSetID ,updateElement.WordID, updateElement.NewValue, updateElement.Field)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: err.Error()})
		return
	}
	err = writeDataJson(w, payloadPlaceholder)
	if err != nil {
		writeErrorJson(w, Type.MessageDisplayError{Message: "未知錯誤 請重試"})
		return
	}
	fmt.Println("Word vocabulary updated successfully")
}

// 處理update word vocabulary的function，適用於單次更新某個word的field
func updateWordElement(wordSetID string, wordID string, newValue any, field string) error {
	// Validate field name and value type
	switch field {
	case "order":
		// JSON decoding. JSON numbers are decoded as float64 by default, not int
		_, ok := newValue.(float64)
		if !ok {
			return errors.New("invalid type: 'order' field must be a int")
		}
	case "vocabulary":
		// Ensure newValue is a string and has length < 20
		strValue, ok := newValue.(string)
		if !ok {
			return errors.New("invalid type: 'vocabulary' field must be a string")
		}
		if len(strings.TrimSpace(strValue)) == 0 {
			return errors.New("單字不得為空")
		}
		if len(strings.TrimSpace(strValue)) > 100 {
			return errors.New("單字不得超過100個字")
		}
	case "definition":
		// Ensure newValue is a string and has length < 20
		strValue, ok := newValue.(string)
		if !ok {
			return errors.New("invalid type: 'definition' field must be a string")
		}
		if len(strings.TrimSpace(strValue)) == 0 {
			return errors.New("註釋不得為空")
		}
		if len(strings.TrimSpace(strValue)) > 300 {
			return errors.New("註釋不得超過300個字")
		}
	case "vocabularySound", "definitionSound":
		// Ensure newValue is a string and has length < 20
		strValue, ok := newValue.(string)
		if !ok {
			return errors.New("invalid type: 'vocabularySound' or 'definitionSound' field must be a string")
		}
		flag := false
		for _, value := range []string{"en-US", "en-GB", "en-AU", "zh-TW", "zh-CN"} {
			if value == strings.TrimSpace(strValue) {
				flag = true
				break
			}
		} 
		if !flag {
			return errors.New("invalid value, accepted value are en-US, en-GB, en-AU, zh-TW, zh-CN")
		}
	case "star":
		// Ensure newValue is of type bool
		if _, ok := newValue.(bool); !ok {
			return errors.New("invalid type: 'star' field must be a boolean")
		}
	
	default:
		return fmt.Errorf("invalid field: '%s' is not allowed", field)
	}
	coll := DB.Client.Database("go-quizlet").Collection("wordSets")

	// Define the filter to find the correct WordSet document
	filter := bson.M{"id": wordSetID, "words.id": wordID}

	// Define the update using arrayFilters to update only the correct word
	updateKey := fmt.Sprintf("words.$[elem].%s", field)
	var update bson.M
	// 記得把float64轉成int
	if field == "order" {
		update = bson.M{
			"$set": bson.M{
				updateKey: int(newValue.(float64)),
			},
		}
	// 如果field為以下這些，則最後的newValue必須要trim space確保資料正確性，否則不用
	} else if field == "vocabulary" || field == "definition" || field == "vocabularySound" || field == "definitionSound" {
		update = bson.M{
			"$set": bson.M{
				updateKey: strings.TrimSpace(newValue.(string)),
			},
		}
	} else {
		update = bson.M{
			"$set": bson.M{
				updateKey: newValue,
			},
		}
	}
	
	// Use array filters to specify which word to update inside the words array
	arrayFilters := options.Update().SetArrayFilters(
		options.ArrayFilters{
			Filters: []any{
				bson.M{"elem.id": wordID}, // Find the word with the matching wordID
			},
		},
	)
	updateWordVocabularyContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Execute the update query
	res, err := coll.UpdateOne(updateWordVocabularyContext, filter, update, arrayFilters)
	if err != nil {
		return errors.New("error updating word")
	}

	// Check if the document was modified
	if res.MatchedCount == 0 {
		fmt.Println("No matching document found")
		return errors.New("no matching document found")
	}
	if res.ModifiedCount == 0 {
		// 如果是更新一樣的值，則不會報錯，但可以單純log出來
		log.Println("No update was made, possibly same value")
	}

	return nil
}
*/


