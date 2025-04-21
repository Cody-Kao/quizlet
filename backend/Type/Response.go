package Type

type Payload any

// 回覆前端的統一type，資料放在Payload裡
type Response struct {
	Type    string  `json:"type"`
	Payload Payload `json:"payload"`
}

type MessageDisplaySuccess struct {
	Message string `json:"message"`
}

// 在userLink component中會要的使用者資訊
type UserLink struct {
	ID   string `json:"id"`
	Role string `json:"role"`
	Name string `json:"name"`
	Img  string `json:"img"`
}

// 給front end的User
type FrontEndUser struct {
	ID            string   `json:"id"`
	Role          string   `json:"role"`
	Name          string   `json:"name"`
	Email         string   `json:"email"`
	Img           string   `json:"img"`
	LikedWordSets []string `json:"likedWordSets"` // 別人的
}

// 給front end的Lib page
type LibPage struct {
	User            LibUser             `json:"user"` // 被查詢的人(有可能是自己)
	CreatedWordSets []LibWordSetDisplay `json:"createdWordSets"`
	LikedWordSets   []LibWordSetDisplay `json:"likedWordSets"`
}

type FullWordCardType struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Words      []Word `json:"words"`
	ShouldSwap bool   `json:"shouldSwap"` // 用來給前端展示是否要swap
}

type SearchWordSetResponse struct {
	WordSetCards []WordSetCard `json:"wordSetCards"`
	HaveMore     bool          `json:"haveMore"`
}

type PreviewWordsResponse struct {
	Words    []Word `json:"words"`
	HaveMore bool   `json:"haveMore"`
}

type RecentVisitResponse struct {
	Record []HomePageWordSet `json:"record"`
}

type NewWordSetResponse struct {
	NewWordSet []HomePageWordSet `json:"newWordSet"`
}

type PopularWordSetResponse struct {
	PopularWordSet []HomePageWordSet `json:"popularWordSet"`
}

type FeedbackResponse struct {
	Feedbacks []Feedback `json:"feedbacks"`
	HaveMore  bool       `json:"haveMore"`
}