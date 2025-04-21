package Type

// 處理前端送過來的request type

// register user with account-password
type AccountPasswordRegisterRequest struct {
	UserName       string `json:"userName" validate:"required"`
	UserEmail      string `json:"userEmail"  validate:"required"`
	UserPassword   string `json:"userPassword" validate:"required"`
	ReUserPassword    string `json:"reUserPassword" validate:"required"`
}

// log in user with account-password
type AccountPasswordLogInRequest struct {
	UserEmail    string `json:"userEmail" validate:"required"`
	UserPassword string `json:"userPassword"  validate:"required" `
}

// register user with OAuth
type OAuthRegisterRequest struct {
	Credential string `json:"credential" validate:"required"`
}

// log in user with OAuth
type OAuthLogInRequest struct {
	Credential string `json:"credential" validate:"required"`
}

/* type UpdateWordElementRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	WordID string `json:"wordID" validate:"required"`
	NewValue any `json:"newValue" validate:"required"`
	Field string `json:"field" validate:"required"`
} */

/*-------------------------------------------------*/

// 用於主要對User進行操作的request所建立的interface(createWordSet也是其中的應用)
type UserRelatedRequest interface {
	GetUserID() string 
}

// create wordSet所送的格式
type CreateWordSetRequest struct {
	UserID string `json:"userID" validate:"required"`
	WordSet WordSet `json:"wordSet" validate:"required"`
}
func (c CreateWordSetRequest) GetUserID() string {
	return c.UserID
}

// Change User Image

// Change User Name
type ChangeUserNameRequest struct {
	UserID string `json:"userID" validate:"required"`
	NewName string `json:"newName" validate:"required"`
} 
func (c ChangeUserNameRequest) GetUserID() string {
	return c.UserID
}

// Change User Email
type ChangeUserEmailRequest struct {
	UserID string `json:"userID" validate:"required"`
	NewEmail string `json:"newEmail" validate:"required"`
	ValidateCode string `json:"validateCode" validate:"required"`
} 
func (c ChangeUserEmailRequest) GetUserID() string {
	return c.UserID
}

type ToggleLikeWordSetRequest struct {
	UserID string `json:"userID" validate:"required"`
	WordSetID string `json:"wordSetID" validate:"required"`
}
func (s ToggleLikeWordSetRequest) GetUserID() string {
	return s.UserID
}

type ForkWordSetRequest struct {
	UserID string `json:"userID" validate:"required"`
	WordSetID string `json:"wordSetID" validate:"required"`
}
func (f ForkWordSetRequest) GetUserID() string {
	return f.UserID
}

/*-------------------------------------------------*/

// 用於主要對WordSet進行操作的request所建立的interface
type WordSetsRelatedRequest interface {
	GetWordSetID() string
}

// editWordSet頁面送的request格式
type EditWordSetRequest struct {
	AddWords []Word `json:"addWords" validate:"required,dive"`
	WordSet EditWordSet `json:"wordSet" validate:"required"`
	RemoveWords []string `json:"removeWords" validate:"required"`
}
func (e EditWordSetRequest) GetWordSetID() string {
	return e.WordSet.ID
}

// delete the whole wordSet
type DeleteWordSetRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
}
func (d DeleteWordSetRequest) GetWordSetID() string {
	return d.WordSetID
}

// delete one word from a wordSet
type DeleteWordRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	WordID string `json:"wordID" validate:"required"`
}
func (d DeleteWordRequest) GetWordSetID() string {
	return d.WordSetID
}

// toggle star of a word in a wordSet
type ToggleWordStarRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	WordID    string `json:"wordID" validate:"required"`
}
func (d ToggleWordStarRequest) GetWordSetID() string {
	return d.WordSetID
}

// toggle star of all words in a wordSet
type ToggleAllWordStarRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	NewStar   bool   `json:"newStar"`
}
func (d ToggleAllWordStarRequest) GetWordSetID() string {
	return d.WordSetID
}

// add a word to a wordSet
type AddWordRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	Word 	  Word   `json:"word" validate:"required"`
}
func (d AddWordRequest) GetWordSetID() string {
	return d.WordSetID
}

// inline update the word in a wordSet
type InlineUpdateWordRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	WordID string `json:"wordID" validate:"required"`
	NewVocabulary string `json:"newVocabulary" validate:"required"`
	NewDefinition string `json:"newDefinition" validate:"required"`
}
func (d InlineUpdateWordRequest) GetWordSetID() string {
	return d.WordSetID
}
// inline update the word in a wordSet
type BigWordCardUpdateWordRequest struct {
	WordSetID string `json:"wordSetID" validate:"required"`
	WordID string `json:"wordID" validate:"required"`
	NewVocabulary string `json:"newVocabulary" validate:"required"`
	NewDefinition string `json:"newDefinition" validate:"required"`
	NewVocabularySound string `json:"newVocabularySound" validate:"required"`
	NewDefinitionSound string `json:"newDefinitionSound" validate:"required"`
}
func (d BigWordCardUpdateWordRequest) GetWordSetID() string {
	return d.WordSetID
}

type ReadMailRequest struct {
	UserID string `json:"userID"`
	MailID string `json:"mailID"`
}
func (r ReadMailRequest) GetUserID() string {
	return r.UserID
}

type AddRecentVisitRequest struct {
	UserID string `json:"userID"` 
	WordSetID string `json:"wordSetID"`
}
func (a AddRecentVisitRequest) GetUserID() string {
	return a.UserID
}

type ToggleAllowCopyRequest struct {
	UserID string `json:"userID"` 
	WordSetID string `json:"wordSetID"`
}
func (t ToggleAllowCopyRequest) GetUserID() string {
	return t.UserID
}

type ToggleIsPublicRequest struct {
	UserID string `json:"userID"` 
	WordSetID string `json:"wordSetID"`
}
func (t ToggleIsPublicRequest) GetUserID() string {
	return t.UserID
}

type CreateFeedbackRequest struct {
	AuthorID  string `json:"authorID" bson:"authorID" validate:"required"`
	Title string `json:"title" bson:"title" validate:"required"`
	Content string `json:"content" bson:"content" validate:"required"`
}
func (c CreateFeedbackRequest) GetUserID() string {
	return c.AuthorID
}

type LogErrorRequest struct{
	UserID string `json:"userID"`
	ErrorID string `json:"errorID"`
	Error string `json:"error"`
	ErrorInfo string `json:"errorInfo"`
	Time string `json:"time"`
}
func (l LogErrorRequest) GetUserID() string {
	return l.UserID
}

type RequestValidateCodeRequest struct {
	Email string `json:"email" validate:"required"`
}

type ResetPasswordRequest struct {
	Email string `json:"email" validate:"required"`
	ValidateCode string `json:"validateCode" validate:"required"`
	Password string `json:"password" validate:"required"`
	RePassword string `json:"rePassword" validate:"required"`
}

type SendActivateEmailRequest struct {
	Email string `json:"email"`
} 

type ActivateEmailRequest struct {
	Token string `json:"token"`
}