class ChoiceManager {
    constructor() {
        this.choices = Object.freeze([
            {
                name: 'Zinger Paratha',
                value: 'paratha-zinger',
                emoji: "1️⃣",
            },
            {
                name: 'Chilli Chicken Paratha',
                value: 'paratha-chilli',
                emoji: "2️⃣",
            },
            {
                name: 'Oman Chips Paratha',
                value: 'paratha-oman',
                emoji: "3️⃣",
            },
            {
                name: 'Nutella Paratha',
                value: 'paratha-nutella',
                emoji: "4️⃣",
            },
            {
                name: 'Omlette Paratha',
                value: 'paratha-omlette',
                emoji: "5️⃣",
            },
            {
                name: 'Hotdog Paratha',
                value: 'paratha-hotdog',
                emoji: "6️⃣",
            },
            {
                name: 'Chicken Club Sandwich (normal)',
                value: 'club-normal',
                emoji: "7️⃣",
            },
            {
                name: 'Chicken CLub Sandwich (spicy)',
                value: 'club-spicy',
                emoji: "8️⃣",
            },
            {
                name: 'Small Karak',
                value: 'karak-small',
                emoji: "9️⃣",
            },
            {
                name: 'Large Karak',
                value: 'karak-large',
                emoji: "🔟",
            },
        ]);
        this.choicesByValue = {};
        for (const choice of this.choices)
            this.choicesByValue[choice.value] = {
                name: choice.name,
                emoji: choice.emoji,
            }
        this.choicesByEmoji = {};
        for (const choice of this.choices)
            this.choicesByEmoji[choice.emoji] = {
                name: choice.name,
                value: choice.value,
            }
    }

    static getInstance(){
        if (!this.instance) this.instance = new ChoiceManager();
        return this.instance;
    }

    get allChoices() {
        return this.choices;
    }
}

export default ChoiceManager.getInstance();
