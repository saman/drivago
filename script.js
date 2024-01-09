const VER = 37;
const LANG = 'en';

const MEDIA_URL = './media/';

new Vue({
    el: '#app',
    data: {
        page: 0,
        listValue: '',
        listValues: ['All', 'Wrongs', 'Corrects', 'Bookmarks'],
        loaded: false,
        hintDialog: false,
        userData: {},
        data: {},
        index: 0,
        progress: 0,
        autoNextQuestion: false,
        loadingAutoNextQuestion: false,
        validateValue: false,
        values: {
            a1: false,
            a2: false,
            a3: false
        },
        answer: {},
        filteredQuestions: [],
    },
    watch: {
        index() {
            this.resetValues();
            this.userData.index = this.index;
            this.setUserData();
        },
        autoNextQuestion() {
            this.userData.autoNextQuestion = this.autoNextQuestion;
            this.setUserData();
        },
        listValue() {
            this.filteredQuestions = this.data.questions.filter(x => {
                if (this.listValue == 'All') {
                    return true;
                } else if (this.listValue == 'Wrongs') {
                    return this.isWrongAnswer(x.id);
                } else if (this.listValue == 'Corrects') {
                    return this.isCorrectAnswer(x.id);
                } else if (this.listValue == 'Bookmarks') {
                    return this.isQuestionBookmarked(x.id);
                }
            });

            if (this.filteredQuestions[this.index] == undefined) {
                this.index = 0;
            }
        }
    },
    computed: {
        questionNumber() {
            return parseInt(this.filteredQuestions[this.index].index) + 1;
        },
        question() {
            if (this.filteredQuestions[this.index] == undefined) {
                return {};
            }

            var question = this.clone(this.filteredQuestions[this.index]);

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

            this.startStat(question.id);

            return question;
        },
        calculateStats() {
            try {
                let totalAnswsered = 0;
                if (this.userData.answers !== undefined) {
                    totalAnswsered = Object.keys(this.userData.answers).filter(i => this.userData.answers[i] === true).length
                }
                return {
                    total: this.data.questions.length - 1,
                    answered: totalAnswsered,
                    unanswered: this.data.questions.length - 1 - totalAnswsered,
                    correct: Object.keys(this.userData.answers).filter(i => this.userData.answers[i] === true).length,
                    wrong: Object.keys(this.userData.answers).filter(i => this.userData.answers[i] === false).length,
                    avgAnswerTime: this.userData.stats ? Object.values(this.userData.stats).map(x => x.end - x.start).reduce((a, b) => a + b, 0) / Object.values(this.userData.stats).length : 0
                }
            } catch (error) {
                return {
                    total: 0,
                    answered: 0,
                    unanswered: 0,
                    correct: 0,
                    wrong: 0,
                    avgAnswerTime: 0
                }
            }
        }
    },
    methods: {
        run() {
            this.userData = this.getUserData();
            this.index = this.userData.index || 0;
            this.progress = this.userData.progress || 0;
            this.autoNextQuestion = this.userData.autoNextQuestion || false;

            this.$http.get('./data/questionnaires.json').then(response => {
                this.data = response.body.filter(x => x.lan == LANG && x.ver == VER).pop();
                this.data.questions = Object.values(this.data.questions).map((x, i) => { x['index'] = i; return x; });
                this.loaded = true;
                this.listValue = 'All';
            });
        },
        nextQuestion() {
            if (this.index < this.filteredQuestions.length - 1) {
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
                a3: this.checkAnswer(this.values.a3, this.question.v3),
            }
            this.validateValue = true
            this.endStat();
            this.storeAnswer();
            this.setUserData();

            if (this.isCorrectAnswer(this.question.id) && this.autoNextQuestion) {
                this.loadingAutoNextQuestion = true;
                setTimeout(() => {
                    this.nextQuestion();
                    this.loadingAutoNextQuestion = false;
                }, 500);
            }
        },
        storeAnswer() {
            if (this.userData.answers === undefined) {
                this.userData.answers = {};
            }

            this.userData.answers[this.question.id] = this.answer.a1 && this.answer.a2 && this.answer.a3;

            this.progress = this.userData.progress = this.calculateProgress();
        },
        startStat(questionId) {
            if (questionId == undefined) {
                return;
            }

            if (this.userData.stats === undefined) {
                this.userData.stats = {};
            }

            if (this.userData.stats[questionId] === undefined) {
                this.userData.stats[questionId] = {
                    tmpStart: new Date().getTime(),
                    start: '',
                    end: ''
                };
            } else {
                this.userData.stats[questionId].tmpStart = new Date().getTime();
            }
            this.setUserData();
        },
        endStat() {
            this.userData.stats[this.question.id].start = this.userData.stats[this.question.id].tmpStart;
            this.userData.stats[this.question.id].end = new Date().getTime();
        },
        toggleBookmark(id) {
            if (this.userData.bookmarks === undefined) {
                this.userData.bookmarks = [];
            }

            let indexQuestion = this.userData.bookmarks.indexOf(id);
            if (indexQuestion === -1) {
                this.userData.bookmarks.push(id);
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
        isWrongAnswer(id) {
            return this.userData.answers ? this.userData.answers[id] == false : false;
        },
        isCorrectAnswer(id) {
            return this.userData.answers ? this.userData.answers[id] == true : false;
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
            return correctAnswer != 'x';
        },
        chooseOneFromMultiple(str) {
            str = str.replaceAll('[', '').replaceAll(']', '');
            arr = str.split('|');
            return this.randomArrayItem(arr);
        },
        calculateProgress() {
            let totalAnswsered = 0;
            if (this.userData.answers !== undefined) {
                totalAnswsered = Object.keys(this.userData.answers).filter(i => this.userData.answers[i] === true).length
            }
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
        },
        timeFormat(time) {
            var date = new Date(0);
            date.setSeconds(time / 1000);
            return date.toISOString().substring(11, 19);
        },
        capitalCase(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    },
    created() {
        this.run();
    }
});