package Type

type Account struct {
	ID       string `json:"id"`
	UserID   string `json:"userID"`
	Password string `json:"password"`
}

// DB裡的User
type User struct {
	ID              string   `json:"id" bson:"id"`
	Role            string   `json:"role" bson:"role"`
	Name            string   `json:"name" bson:"name" validate:"required"`
	Email           string   `json:"email" bson:"email" validate:"required"`
	Mails           []string `json:"mails" bson:"mails"` // 紀錄mail IDs
	Password        string   `json:"password,omitempty" bson:"password,omitempty"`
	Img             string   `json:"img" bson:"img"`
	IsGoogle        bool     `json:"isGoogle" bson:"isGoogle"`
	CreatedWordSets []string `json:"createdWordSets" bson:"createdWordSets"` // 自創的
	LikedWordSets   []string `json:"likedWordSets" bson:"likedWordSets"`     // 別人的
	CreatedAt       string   `json:"createdAt" bson:"createdAt"`
	LikedCnt        int      `json:"likedCnt" bson:"likedCnt"`   // 單字集被收藏次數
	ForkedCnt       int      `json:"forkedCnt" bson:"forkedCnt"` // 單字集被複製次數
}

// 在Lib Page顯示wordSet的type
type LibWordSetDisplay struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	AuthorID  string `json:"authorID"`
	WordCnt   int    `json:"wordCnt"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// 在lib page會展示的使用者資訊
type LibUser struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Name      string `json:"name"`
	Img       string `json:"img"`
	CreatedAt string `json:"createdAt"`
	LikeCnt   int    `json:"likeCnt"`
	ForkCnt   int    `json:"forkCnt"`
}

/*
omitempty會將以下omit掉

false
0
""
nil
長度為0的slice或map

*/

type Word struct {
	ID              string `json:"id" bson:"id"`
	Order           int    `json:"order" bson:"order" validate:"required"`
	Vocabulary      string `json:"vocabulary" bson:"vocabulary" validate:"required"`
	Definition      string `json:"definition" bson:"definition" validate:"required"`
	VocabularySound string `json:"vocabularySound" bson:"vocabularySound" validate:"required"`
	DefinitionSound string `json:"definitionSound" bson:"definitionSound" validate:"required"`
	Star            bool   `json:"star" bson:"star"`
}

/*
validate:"required,min=1,dive,required"
第一個required檢查欄位是否為nil，所以empty slice也會過關
第二個檢查如果是slice或map，則至少需要有一個元素
第三個dive是深入檢查slice中的成員是否合規定，但如果是空slice也會過，因為slice中沒有元素讓他檢查
這樣設定min就很重要
*/
// 而empty string在Golang裡面是zero value，所以不會過validate
// 而如果在bool值中做validate:"required" 則false會被擋，因為他是zero value
type WordSet struct {
	ID          string   `json:"id" bson:"id"`
	Title       string   `json:"title" bson:"title" validate:"required"`
	Description string   `json:"description" bson:"description"`
	AuthorID    string   `json:"authorID" bson:"authorID" validate:"required"` // 原作者
	CreatedAt   string   `json:"createdAt" bson:"createdAt"`
	UpdatedAt   int64    `json:"updatedAt" bson:"updatedAt"` // 存成int方便比大小，在前端自行format就好
	Words       []Word   `json:"words" bson:"words" validate:"required,min=1,dive"`
	ShouldSwap  bool     `json:"shouldSwap" bson:"shouldSwap"` // 用來給前端展示是否要swap
	LikedUsers  []string `json:"likedUsers" bson:"likedUsers"` // 儲存按讚的人
	Likes       int      `json:"likes" bson:"likes"`           // 讚數
	WordCnt     int      `json:"wordCnt" bson:"wordCnt"`       // 字數統計
	AllowCopy   bool     `json:"allowCopy" bson:"allowCopy"`   // 允許他人複製/衍生
	IsPublic    bool     `json:"isPublic" bson:"isPublic"`     // 允許發布在首頁(最新/熱門單字集)
}

// editWordSet request中的editWord格式
type EditWord struct {
	ID              string `json:"id" bson:"id" validate:"required"`
	Order           int    `json:"order" bson:"order"`
	Vocabulary      string `json:"vocabulary" bson:"vocabulary"`
	Definition      string `json:"definition" bson:"definition"`
	VocabularySound string `json:"vocabularySound" bson:"vocabularySound"`
	DefinitionSound string `json:"definitionSound" bson:"definitionSound"`
}

// editWordSet request中的EditWordSet格式
type EditWordSet struct {
	ID          string     `json:"id" bson:"id" validate:"required"`
	Title       any        `json:"title" bson:"title"`
	Description any        `json:"description" bson:"description"`
	Words       []EditWord `json:"words" bson:"words" validate:"required,dive"`
	ShouldSwap  bool       `json:"shouldSwap" bson:"shouldSwap"`
}

type WordSetForLib struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	AuthorID  string `json:"authorID"`
	WordCnt   int    `json:"wordCnt"`
	CreatedAt string `json:"createdAt"`
}

// for wordSetCard in search page
type WordSetCard struct {
	ID         string `json:"id" bson:"id"`
	Title      string `json:"title" bson:"title"`
	AuthorID   string `json:"authorID" bson:"authorID"`
	UpdatedAt  int64  `json:"updatedAt" bson:"updatedAt"`
	ShouldSwap bool   `json:"shouldSwap" bson:"shouldSwap"`
	WordCnt    int    `json:"wordCnt" bson:"wordCnt"`
	Likes      int    `json:"likes" bson:"likes"`
}

// send this to the front for displaying popular wordSet in homepage
type PopularWordSet struct {
	Sets []WordSetCard `json:"sets"`
}

// for mail modal
type MailViewType struct {
	ID         string `json:"id" bson:"id" validate:"required"`
	Title      string `json:"title" bson:"title" validate:"required"`
	Content    string `json:"content" bson:"content" validate:"required"`
	Date       int64  `json:"date" bson:"date" validate:"required"`
	ReceiverID string `json:"receiverID" bson:"receiverID" validate:"required"`
	Read       bool   `json:"read" bson:"read"`
}

type ImgurResponse struct {
	Data struct {
		ID         string `json:"id"`
		Link       string `json:"link"`
		DeleteHash string `json:"deletehash"`
	} `json:"data"`
	Success bool `json:"success"`
	Status  int  `json:"status"`
}

type RecentVisit struct {
	ID     string   `json:"id" bson:"id"`
	Record []string `json:"record" bson:"record"`
}

type HomePageWordSet struct {
	ID       string `json:"id" bson:"id"`
	Title    string `json:"title" bson:"title"`
	AuthorID string `json:"authorID" bson:"authorID"`
	WordCnt  int    `json:"wordCnt" bson:"wordCnt"`
}

type Feedback struct {
	ID                 string `json:"id" bson:"id"`
	AuthorID           string `json:"authorID" bson:"authorID" validate:"required"`
	Title              string `json:"title" bson:"title" validate:"required"`
	Content            string `json:"content" bson:"content" validate:"required"`
	CreatedAt          int64  `json:"createdAt" bson:"createdAt"`
	FormattedCreatedAt string `json:"formattedCreatedAt" bson:"formattedCreatedAt"`
}

type LogError struct {
	ID        string `json:"id" bson:"id"`
	UserID    string `json:"userID" bson:"userID"`
	ErrorID   string `json:"ErrorID" bson:"errorID"`
	Error     string `json:"error" bson:"error"`
	ErrorInfo string `json:"errorInfo" bson:"errorInfo"`
	Time      string `json:"time" bson:"time"`
}

type ResetAccountORPassword struct {
	ValidateCode string `json:"validateCode" bson:"validateCode"`
	Email        string `json:"email" bson:"email"`
	Expire       int64  `json:"expire" bson:"expire"`
}

type EmailHTMLDate struct {
	Email string
	Data  string
}

type ActivateEmail struct {
	Email     string `json:"email" bson:"email"`
	Token     string `json:"token" bson:"token"`
	Expire    int64  `json:"expire" bson:"expire"` // 開通跟註冊的時間是共用的
	Activated bool   `json:"activated" bson:"activated"`
}