const VER = 37;
const LANG = 'en';

const MEDIA_URL = './media/';

new Vue({
    el: '#app',
    data: {
        page: 0,
        loaded: false,
        userData: {},
        data: {},
        index: 0,
        validateValue: false,
        values: {
            a1: false,
            a2: false,
            a3: false
        },
        originalQuestion: {},
    },
    watch: {
        index() {
            this.userData.index = this.index;
            this.setUserData();
        }
    },
    computed: {
        question() {
            var key = Object.keys(this.data.questions)[this.index];
            this.originalQuestion = this.data.questions[key];

            var question = this.clone(this.originalQuestion)


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
            this.$http.get('./data/questionnaires.json').then(response => {
                this.data = response.body.filter(x => x.lan == LANG && x.ver == VER).pop();
                this.loaded = true;
            });
            this.userData = this.getUserData();
            this.index = this.userData.index || 0;
        },
        nextQuestion() {
            this.resetValues();
            this.index++;
        },
        prevQuestion() {
            this.resetValues();
            this.index--;
        },
        validate() {
            this.validateValue = true
        },
        resetValues() {
            this.validateValue = false;
            this.values = {
                a1: false,
                a2: false,
                a3: false
            };
        },
        chooseOneFromMultiple(str) {
            str = str.replaceAll('[', '').replaceAll(']', '');
            str = str.split('|');
            return this.randomArrayItem(str);
        },
        getUserData() {
            return JSON.parse(localStorage.getItem('user-data')) || {};
        },
        setUserData() {
            localStorage.setItem('user-data', JSON.stringify(this.userData));
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
        }
    },
    created() {
        this.run();
    }
});