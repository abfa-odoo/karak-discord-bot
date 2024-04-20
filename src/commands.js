import dotenv from 'dotenv';
dotenv.config();

import ChoiceManager from './choices.js';
import { REST, Routes, SlashCommandBuilder, ApplicationCommandOptionType } from 'discord.js';

const commands = [
    {
        name: 'karak-thread',
        description: 'Create a new thread and create a poll inside for placing orders'
    },
    {
        name: 'custom-quantity',
        description: 'Order different quantities of an item (this overrides your selection in the poll, if any)',
        options: [
            {
                name: 'item',
                description: 'Item',
                type: ApplicationCommandOptionType.String,
                require: true,
                choices: ChoiceManager.allChoices.map(({name, value}) => ({name, value})),
            },
            {
                name: 'quantity',
                description: 'Quantity',
                type: ApplicationCommandOptionType.Integer,
                require: true,
            },
            {
                name: 'member',
                description: 'Member',
                type: ApplicationCommandOptionType.User,
            },
        ]
    },
    {
        name: 'custom-order',
        description: 'Order something new since you are feeling adventurous today',
        options: [
            {
                name: 'item',
                description: 'Item',
                type: ApplicationCommandOptionType.String,
                require: true,
            },
            {
                name: 'quantity',
                description: 'Quantity',
                type: ApplicationCommandOptionType.Integer,
                require: true,
            },
            {
                name: 'member',
                description: 'Member',
                type: ApplicationCommandOptionType.User,
            },
        ]
    },
    {
        name: 'my-orders',
        description: 'View your current orders.',
    },
    {
        name: 'reset-orders',
        description: 'Reset your current orders.',
    },
    {
        name: 'finish-ordering',
        description: 'Get a summary of orders to send on WhatsApp and close the thread.',
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    console.log('Registering slash commands...');

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log('Registered slash commands.');
    } catch (error) {
        console.log(`There was an error: ${error}`);
    }
})();
