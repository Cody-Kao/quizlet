package Consts

import (
	"os"
	"time"

	"golang.org/x/time/rate"
)

var PORT = os.Getenv("PORT")
var MongoDB_uri = os.Getenv("mongoDB_uri")
var FrontendPATH = os.Getenv("FrontendPATH") // frontend url
var ADMINID = os.Getenv("go_quizlet_admin_id")
var ADMINNAME = os.Getenv("go_quizlet_admin_name")

var DefaultJWTExpireTime = time.Now().Add(time.Hour * 24 * 7)

var (
	MaxNameLen = 12
	MaxTitleLen = 50
	MaxContentLen = 300
	MaxDescriptionLen = 150
	MaxVocabularyLen = 100
	MaxDefinitionLen = 300
	MaxUploadSize = 10 << 20 // 10 MB
	MaxDataFetch = 6 // 一次最多拿6比資料
	ResetPasswordValidateCodeExpire = 5 * 60 // 5分鐘換算成秒數 這是驗證碼時效
	MinResendTimeBuffer = 3 * 60 // 這是重新申請驗證碼的間隔時間
	ActivateEmailExpire = 5 * 60 // 5分鐘內完成email驗證
	MinActivateEmailExpire = 3 * 60 // 這是重新申請郵件開通的間隔時間
	ActivatedEmailRegisterExpire = 5 * 60 // 5分鐘內完成該email註冊
)

var APILimit rate.Limit = 35;
var APIBurst = 40

var JWTClientID = os.Getenv("JWTClientID")

var ImgurUploadURL = os.Getenv("imgur_upload_img_url")
var ImgurClientID = os.Getenv("imgur-go-quizlet-clientID")
var ImgurAccessToken, present = os.LookupEnv("imgur_go_quizlet_accessToken") // 一個月要用postman去更新他