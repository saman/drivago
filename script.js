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
        resetUserDataDialog: false,
        userData: {},
        data: {},
        index: 0,
        progress: 0,
        autoNextQuestion: false,
        questionLanguage: LANG,
        loadingAutoNextQuestion: false,
        validateValue: false,
        values: {
            a1: false,
            a2: false,
            a3: false
        },
        answer: {},
        filteredQuestions: [],
        stats: {},
        tmpStart: 0,
        randomizeAnswerIds: [1, 2, 3]
    },
    watch: {
        loaded() {
            this.calculateStats();
        },
        index() {
            this.resetValues();
            this.userData.index = this.index;
            this.setUserData();
        },
        page() {
            this.startStat();
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
            if (this.filteredQuestions[this.index] == undefined) {
                return 0;
            }
            return parseInt(this.filteredQuestions[this.index].index) + 1;
        },
        question() {
            if (this.filteredQuestions[this.index] == undefined) {
                return {};
            }
            var question = this.clone(this.filteredQuestions[this.index]);

            var randomIndex = this.randomArrayIndex(this.multipleStrToArray(question.q));

            question.q = this.multipleStrToArray(question.q)[randomIndex];
            if (question.a1) {
                question.a1 = this.multipleStrToArray(question.a1)[randomIndex];
            }
            if (question.a2) {
                question.a2 = this.multipleStrToArray(question.a2)[randomIndex];
            }
            if (question.a3) {
                question.a3 = this.multipleStrToArray(question.a3)[randomIndex];
            }
            if (question.p) {
                question.p = this.multipleStrToArray(question.p)[randomIndex];
                question.image = `${MEDIA_URL}${question.p}.jpg`;
            }

            if (question.v) {
                question.v = this.multipleStrToArray(question.v)[randomIndex];
                question.video = `${MEDIA_URL}${question.v}.mp4`;
            }

            if (question.pr) {
                question.pr = this.multipleStrToArray(question.pr)[randomIndex];
            }

            question.bookmark = this.isQuestionBookmarked(question.id);

            this.randomizeAnswerIds.sort(() => Math.random() - 0.5);

            this.startStat();

            return question;
        }
    },
    methods: {
        run() {
            this.userData = this.getUserData();
            this.index = this.userData.index || 0;
            this.progress = this.userData.progress || 0;
            this.autoNextQuestion = this.userData.autoNextQuestion || false;
            this.userData.stats = this.userData.stats || {};
            this.questionLanguage = this.userData.lang || LANG;

            this.$http.get('./data/questionnaires.json').then(response => {
                this.data = response.body.filter(x => x.lan == this.userData.lang && x.ver == VER).pop();
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
        startStat() {
            this.tmpStart = new Date().getTime();
        },
        endStat() {
            if (this.question.id == undefined) {
                return;
            }

            if (this.userData.stats[this.question.id] === undefined) {
                this.userData.stats[this.question.id] = {
                    start: 0,
                    end: 0
                };
            }

            this.userData.stats[this.question.id].start = this.tmpStart;
            this.userData.stats[this.question.id].end = new Date().getTime();

            this.calculateStats();
        },
        calculateStats() {
            try {
                this.stats['total'] = this.data.questions ? (this.data.questions.length - 1) : 0;
                this.stats['answered'] = Object.keys(this.userData.answers).length || 0;
                this.stats['unanswered'] = this.stats['total'] - this.stats['answered'];
                this.stats['correct'] = Object.keys(this.userData.answers).filter(i => this.userData.answers[i] === true).length || 0;
                this.stats['wrong'] = Object.keys(this.userData.answers).filter(i => this.userData.answers[i] === false).length || 0;
                this.stats['progress'] = this.userData.progress || 0;
                this.stats['avgAnswerTime'] = this.userData.stats ? Object.values(this.userData.stats).map(x => x.end - x.start).reduce((a, b) => a + b, 0) / Object.values(this.userData.stats).length : 0
            } catch (error) {
                console.log(error);
            }
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
        multipleStrToArray(str) {
            str = str.replaceAll('[', '').replaceAll(']', '');
            return str.split('|');
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
        backupUserData() {
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.userData));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "drivago.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        },
        importUserData() {
            var file = document.getElementById('file').files[0];
            var reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.userData = JSON.parse(e.target.result);
                    this.setUserData();
                    location.reload();
                } catch (error) {
                    alert('Invalid file');
                }
            }
            reader.readAsText(file);
        },
        importUserDataTrigger() {
            document.getElementById('file').click();
        },
        resetUserData() {
            this.userData = {};
            this.setUserData();
            location.reload();
        },
        onQuestionLanguageChange() {
            this.userData.lang = this.questionLanguage;
            this.setUserData();
            location.reload();
        },        
        randomArrayIndex(arr) {
            return Math.floor(Math.random() * arr.length);
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