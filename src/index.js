import dotenv from 'dotenv';
dotenv.config();

import { Client, IntentsBitField, Events, EmbedBuilder } from 'discord.js';
import ChoiceManager from './choices.js';

const THREAD_NAME = 'karak-orders';

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions,
    ]
});

client.once(Events.ClientReady, readyClient => {
    console.log(`It's Karak time! ${readyClient.user.tag} is online.`)
});

let orderData = {};
let customOrders = {};
let pollMessage = null;

const printOrdersByItem = async function () {
    const itemData = {};
    for (const username of Object.keys(orderData)) {
        for (const [item, qty] of Object.entries(orderData[username])) {
            if (!(item in itemData))
                itemData[item] = 0;
            itemData[item] += qty;
        }
    }
    let ordersString = '';
    for (const [item, qty] of Object.entries(itemData))
        ordersString += `${ChoiceManager.choicesByValue[item]?.name || item}  ${qty}\n`;
    return ordersString;
}

const printOrdersByUsername = async function (username) {
    if (!(username in orderData)) return;
    let ordersString = '';
    for (const [k, qty] of Object.entries(orderData[username]))
        ordersString += `${ChoiceManager.choicesByValue[k]?.name || k}  ${qty}\n`
    return ordersString;
}

const resetOrders = async function (username) {
    if (!pollMessage) {
        await interaction.reply({ content: 'Beep boop. Memory unsynced. Please create another thread.' });
        await interaction.channel.setArchived(true);
        return;
    }

    if (username in orderData) delete orderData[username];
    if (username in customOrders) delete customOrders[username];

    for (const reaction of pollMessage.reactions.cache.values()) {
        if (reaction.count == 1) continue;
        const choice = ChoiceManager.choicesByEmoji[reaction._emoji.name];
        if (!choice) continue;
        const reactionUsers = await reaction.users.fetch();
        for (const user of reactionUsers.values()) {
            if (user.username === username) {
                reaction.users.remove(user.id);
                break;
            }
        }
    }
}

const syncOrders = async function (interaction) {
    if (!pollMessage) {
        await interaction.reply({ content: 'Beep boop. Memory unsynced. Please create another thread.' });
        await interaction.channel.setArchived(true);
        return;
    }

    orderData = {}; // reset
    for (const reaction of pollMessage.reactions.cache.values()) {
        if (reaction.count == 1) continue;
        const choice = ChoiceManager.choicesByEmoji[reaction._emoji.name];
        if (!choice) continue;
        const reactionUsers = await reaction.users.fetch();
        for (const user of reactionUsers.values()) {
            if (user.id === process.env.CLIENT_ID) continue;
            const username = user.username;
            if (!(username in orderData)) orderData[username] = {};
            const item = choice.value;
            if (item in orderData[username]) continue;
            orderData[username][item] = 1;
        }
    }

    for (const [username, order] of Object.entries(customOrders)) {
        if (!(username in orderData)) orderData[username] = {};
        const item = order.item;
        orderData[username] = { ...orderData[username], ...customOrders[username] }; // replace orders from poll with custom ones
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.commandName === 'karak-thread') {
        if (!interaction.isChatInputCommand()) {
            await interaction.reply({ content: 'Use the chat input command to create a new thread.', ephemeral: true });
            return;
        }

        if (interaction.channel.isThread()) {
            await interaction.reply({ content: 'You cannot create a new thread from within a thread.', ephemeral: true });
            return;
        }

        if (interaction.channel.threads.cache.find(t => t.name === THREAD_NAME && !t.archived)) {
            await interaction.reply({ content: 'There is an active thread already. Close it before creating a new thread.', ephemeral: true });
            return;
        }

        // create a new thread
        const thread = await interaction.channel.threads.create({
            name: THREAD_NAME,
            reason: 'Place your orders using Karak Bot',
        });
        console.log('New thread created for placing orders.');

        // create choices
        const embed = new EmbedBuilder()
            .setTitle('Menu')
            .setDescription('Select your items using reactions or use commands for more options.')
            .addFields(
                ChoiceManager.allChoices.map(({ name, value, emoji }) => ({ name: `${emoji}  ${name}`, value }))
            );
        thread.send({ embeds: [embed] })
            .then(message => {
                pollMessage = message;
                message.react('1️⃣')
                    .then(() => message.react('2️⃣'))
                    .then(() => message.react('3️⃣'))
                    .then(() => message.react('4️⃣'))
                    .then(() => message.react('5️⃣'))
                    .then(() => message.react('6️⃣'))
                    .then(() => message.react('7️⃣'))
                    .then(() => message.react('8️⃣'))
                    .then(() => message.react('9️⃣'))
                    .then(() => message.react('🔟'))
            })
            .then(() => interaction.reply({ content: "It's Karak time! Place your orders in the thread using the poll." }));
    }

    else if (interaction.commandName === 'custom-quantity') {
        if (!interaction.channel.isThread() || interaction.channel.name !== THREAD_NAME) {
            await interaction.reply({ content: 'This command only works in a Karak thread.', ephemeral: true });
            return;
        }
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        if (!item || !quantity) {
            await interaction.reply({ content: 'One or more mandatory options are missing in the command.', ephemeral: true });
            return;
        }
        const member = interaction.options.getUser('member');
        const username = member ? member.username : interaction.user.username;
        if (!(username in customOrders))
            customOrders[username] = {};
        customOrders[username][item] = quantity;
        syncOrders(interaction)
            .then(() => {
                if (member)
                    interaction.reply({ content: `Order placed for ${member.globalName || member.username}.`, ephemeral: true });
                else
                    printOrdersByUsername(username)
                        .then((orderString) => interaction.reply({ content: `Order placed. Your orders:\n${orderString}`, ephemeral: true }))
            });
    }

    else if (interaction.commandName === 'custom-order') {
        if (!interaction.channel.isThread() || interaction.channel.name !== THREAD_NAME) {
            await interaction.reply({ content: 'This command only works in a Karak thread.', ephemeral: true });
            return;
        }
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        if (!item || !quantity) {
            await interaction.reply({ content: 'One or more mandatory options are missing in the command.', ephemeral: true });
            return;
        }
        const member = interaction.options.getUser('member');
        const username = member ? member.username : interaction.user.username;
        if (!(username in customOrders))
            customOrders[username] = {};
        customOrders[username][item] = quantity;
        syncOrders(interaction)
            .then(() => {
                if (member)
                    interaction.reply({ content: `Order placed for ${member.globalName || member.username}.`, ephemeral: true });
                else
                    printOrdersByUsername(username)
                        .then((orderString) => interaction.reply({ content: `Order placed. Your orders:\n${orderString}`, ephemeral: true }))
            });
    }

    else if (interaction.commandName === 'my-orders') {
        if (!interaction.isChatInputCommand()) {
            await interaction.reply({ content: 'Use the chat input command to create a new thread.', ephemeral: true });
            return;
        }

        if (!interaction.channel.isThread() || interaction.channel.name !== THREAD_NAME) {
            await interaction.reply({ content: 'This command only works in a Karak thread.', ephemeral: true });
            return;
        }
        const username = interaction.user.username;
        syncOrders(interaction)
            .then(() => printOrdersByUsername(username)
                .then((orderString) => {
                    if (!orderString)
                        interaction.reply({ content: '_Null. Place an order now._', ephemeral: true });
                    else
                        interaction.reply({ content: `Your orders:\n${orderString}`, ephemeral: true });
                })
            );
    }

    else if (interaction.commandName === 'reset-orders') {
        if (!interaction.isChatInputCommand()) {
            await interaction.reply({ content: 'Use the chat input command to create a new thread.', ephemeral: true });
            return;
        }

        if (!interaction.channel.isThread() || interaction.channel.name !== THREAD_NAME) {
            await interaction.reply({ content: 'This command only works in a Karak thread.', ephemeral: true });
            return;
        }
        const username = interaction.user.username;
        resetOrders(username)
            .then(() => interaction.reply({ content: 'Orders reset.', ephemeral: true }));
    }

    else if (interaction.commandName === 'finish-ordering') {
        if (!interaction.isChatInputCommand()) {
            await interaction.reply({ content: 'Use the chat input command to create a new thread.', ephemeral: true });
            return;
        }

        if (!interaction.channel.isThread() || interaction.channel.name !== THREAD_NAME) {
            await interaction.reply({ content: 'This command only works in a Karak thread.', ephemeral: true });
            return;
        }

        if (!pollMessage) {
            await interaction.reply({ content: 'Beep boop. Memory unsynced. Please create another thread.' });
            await interaction.channel.setArchived(true);
            return;
        }

        await interaction.deferReply();

        const membersByUsername = {}
        for (const reaction of pollMessage.reactions.cache.values()) {
            if (reaction.count == 1) continue;
            const choice = ChoiceManager.choicesByEmoji[reaction._emoji.name];
            if (!choice) continue;
            const reactionUsers = await reaction.users.fetch();
            for (const user of reactionUsers.values()) {
                membersByUsername[user.username] = user;
            }
        }

        for (const username of Object.keys(membersByUsername))
            await syncOrders(username);

        let summaryString = '';
        for (const [username,] of Object.entries(orderData)) {
            let orderString = await printOrdersByUsername(username);
            summaryString += `_${membersByUsername[username]?.globalName || username}'s Orders:_\n${orderString}\n`;
        }

        const whatsappString = await printOrdersByItem();
        await interaction.editReply({ content: `**ORDER SUMMARY**\n${summaryString}\n**FOR WHATSAPP**\n${whatsappString}` });
        await interaction.channel.setArchived(true);
    }
});

client.login(process.env.TOKEN);
