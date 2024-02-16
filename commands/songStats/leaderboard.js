const { SlashCommandBuilder } = require('discord.js');
const data = require('../../data.js');
const taikodb = require('../../taikodb.js'); //TODO: remove this relative path shit
const bot = require('../../bot.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Song leaderboard')
        .addStringOption(option =>
            option.setName('song')
            .setDescription('Song name')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('Difficulty of the map')
                .setRequired(true)
                .addChoices(
                    { name: 'かんたん/Easy', value: '1' },
                    { name: 'ふつう/Normal', value: '2' },
                    { name: 'むずかしい/Hard', value: '3' },
                    { name: 'おに/Oni', value: '4'},
                    { name: 'おに (裏) / Ura Oni', value: '5'}
                )
)
    ,
    //handle autocomplete interaction
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(); // Get query

        // Timeout promise
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({}), 2500)); // 2.5 seconds

        // Autocomplete promise
        const autocompletePromise = data.autocomplete(focusedValue);

        // Race the autocomplete and timeout promises
        const filteredPromise = Promise.race([autocompletePromise, timeoutPromise]);

        filteredPromise.then(filtered => {
            // Send result back to Discord
            interaction.respond(
                filtered.map(choice => ({ name: choice[0], value: choice[1] }))
            ).catch(error => {
                console.error('Error responding to interaction:', error);
            });
        }).catch(error => {
            console.error('Error in autocomplete or timeout:', error);
        });
    },
    async execute(interaction) {
        const songInput = interaction.options.getString('song');
        const difficulty = interaction.options.getString('difficulty');
        if (!songInput.includes('|')) interaction.reply('Bad'); //TODO: Change this to standard error msg
        let [uniqueId, lang] = songInput.split('|');
        lang = parseInt(lang);
        const res = taikodb.getLeaderboard(uniqueId, difficulty); //taiko DB query result
        let desc = '';
        for (let i in res) {
            const crown = bot.crownIdToEmoji(res[i].BestCrown)
            desc += `${i}. ${res[i].MyDonName}: ${crown}${res[i].BestScore}\n`
        }
        const returnEmbed = {
                    title: `${data.getSongName(uniqueId, lang)} | ${taikodb.difficultyIdToName(difficulty, lang)}`,
                    description: desc ,
                    color: 15410003,
                    author: {
                        name: "Leaderboard"
                    },
                    timestamp: new Date().toISOString()
                };
        interaction.reply({ embeds: [returnEmbed] });
    },
};