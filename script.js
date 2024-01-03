const VER = 37;
const LANG = 'en';

const MEDIA_URL = './media/';

new Vue({
    el: '#app',
    data: {
        page: 0,
        loaded: false,
        hintDialog: false,
        userData: {},
        data: {},
        index: 0,
        progress: 0,
        validateValue: false,
        values: {
            a1: false,
            a2: false,
            a3: false
        },
        answer: {},
        originalQuestion: {},
    },
    watch: {
        index() {
            this.resetValues();
            this.userData.index = this.index;
            this.setUserData();
        },
        loaded() {
            this.progress = this.calculateProgress();
        }
    },
    computed: {
        questionNumber() {
            return parseInt(this.index) + 1;
        },
        question() {
            // var key = Object.keys(this.data.questions)[this.index];
            this.originalQuestion = this.data.questions[this.index];

            var question = this.clone(this.originalQuestion);


            question.q = this.chooseOneFromMultiple(question.q);
            if (question.a1) {
                question.a1 = this.chooseOneFromMultiple(question.a1);
            }
            if (question.a2) {
                question.a2 = this.chooseOneFromMultiple(question.a2);
            }
            if (question.a3) {
                question.a3 = this.chooseOneFromMultiple(question.a3);
            }
            if (question.p) {
                question.p = this.chooseOneFromMultiple(question.p);
                question.image = `${MEDIA_URL}${question.p}.jpg`;
            }

            if (question.v) {
                question.v = this.chooseOneFromMultiple(question.v);
                question.video = `${MEDIA_URL}${question.v}.mp4`;
            }

            if (question.pr) {
                question.pr = this.chooseOneFromMultiple(question.pr);
            }

            return question;
        }
    },
    methods: {
        run() {
            this.userData = this.getUserData();
            this.index = this.userData.index || 0;

            this.$http.get('./data/questionnaires.json').then(response => {
                this.data = response.body.filter(x => x.lan == LANG && x.ver == VER).pop();
                this.data.questions = Object.values(this.data.questions);
                this.loaded = true;
            });
        },
        nextQuestion() {
            if (this.index < Object.keys(this.data.questions).length) {
                this.index++;
            }
        },
        prevQuestion() {
            if (this.index > 0) {
                this.index--;
            }
        },
        validate() {
            this.answer = {
                a1: this.checkAnswer(this.values.a1, this.question.v1),
                a2: this.checkAnswer(this.values.a2, this.question.v2),
                a3: this.checkAnswer(this.values.a2, this.question.v3),
            }
            this.validateValue = true

            if (this.userData.answers === undefined) {
                this.userData.answers = {};
            }
            this.userData.answers[this.index] = [this.values.a1, this.values.a2, this.values.a3]
            this.progress = this.calculateProgress();
            this.setUserData();
        },
        toggleBookmark() {
            if (this.userData.bookmarks === undefined) {
                this.userData.bookmarks = [];
            }

            let indexQuestion = this.userData.bookmarks.indexOf(this.question.id);
            if (indexQuestion === -1) {
                this.userData.bookmarks.push(this.question.id);
            } else {
                this.userData.bookmarks.splice(indexQuestion, 1);
            }

            this.setUserData();
        },
        jumpToQuestion(index) {
            this.index = index;
            this.page = 0;
        },
        isQuestionBookmarked(id) {
            return this.userData.bookmarks ? this.userData.bookmarks.includes(id) : false;
        },
        resetValues() {
            this.validateValue = false;
            this.answer = {};
            this.values = {
                a1: false,
                a2: false,
                a3: false
            };
        },
        checkAnswer(userAnswer, correctAnswer) {
            if (userAnswer) {
                if (correctAnswer == 'x') {
                    return true;
                }
                return false;
            }
            return correctAnswer == 'x';
        },
        chooseOneFromMultiple(str) {
            str = str.replaceAll('[', '').replaceAll(']', '');
            arr = str.split('|');
            return this.randomArrayItem(arr);
        },
        calculateProgress() {
            let totalAnswsered = 0;
            if (this.userData.answers !== undefined) {
                totalAnswsered = Object.keys(this.userData.answers).length;
            }
            console.log(totalAnswsered);
            return totalAnswsered / (this.data.questions.length - 1)
        },
        getUserData() {
            return JSON.parse(localStorage.getItem('user-data')) || {};
        },
        setUserData() {
            localStorage.setItem('user-data', JSON.stringify(this.userData));
        },
        resetUserData() {
            this.userData = {};
            this.setUserData();
            location.reload();
        },
        randomArrayItem(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },
        clone(obj) {
            return JSON.parse(JSON.stringify(obj))
        }
    },
    filters: {
        len(obj) {
            return Object.keys(obj).length;
        },
        chooseOne(str) {
            str = str.replaceAll('[', '').replaceAll(']', '');
            arr = str.split('|');
            return arr[Math.floor(Math.random() * arr.length)];
        },
        percentage(num) {
            return Number(Math.ceil(num * 10000) / 100).toFixed(2) + '%';
        }
    },
    created() {
        this.run();
    }
});