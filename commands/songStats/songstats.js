const { SlashCommandBuilder } = require('discord.js');
const data = require('@data');
const taikodb = require('@taikodb');
const bot = require('@bot');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('songstats')
    .setDescription('Song Statistics')
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
          { name: 'おに/Oni', value: '4' },
          { name: 'おに (裏)/Ura Oni', value: '5' }
        )
    )
  ,
  //handle autocomplete interaction
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused(); // Get query

    // Timeout promise
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve([]), 2500)); // 2.5 seconds

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
    const difficulty = parseInt(interaction.options.getString('difficulty'));
    //error checking
    let uniqueId, lang;
    if (songInput.includes('|')) { //search with autocomplete
      [uniqueId, lang] = songInput.split('|');
      lang = parseInt(lang);
      if (!data.isLangInRange(lang)) {
        await bot.replyWithErrorMessage(interaction, 'songstats', 'Bad input: invalid lang');
        return;
      }
      if (!data.isSongPresent(uniqueId)) {
        await bot.replyWithErrorMessage(interaction, 'songstats', 'Bad input: invalid song ID');
        return;
      }
      await interaction.deferReply();
    } else { //search without autocomplete
      await interaction.deferReply();
      let searchResult = data.searchSongs(songInput);
      if (searchResult.length === 0) {
        await interaction.editReply({
          embeds: [{
            title: 'Error',
            description: `Song ${songInput} not found!`,
            color: 13369344,
            author: {
              name: 'Song Statistics'
            }
          }]
        });
        return;
      }
      [uniqueId, lang] = searchResult;
      lang = parseInt(lang);
    }
    desc = '';

    if (data.getPapamamaFromSong(uniqueId)) {
      desc = '**パパママサポート**\n';
      if (lang === 1) desc = '**Helping Hand Mode**\n';
    }

    if (data.getBranchFromSong(uniqueId)[difficulty - 1]) desc += '**This difficulty contains diverge notes**'
    let fields = [];

    let genreLabel = 'ジャンル';
    if(lang === 1) {
      genreLabel = 'Genre';
    }
    fields.push({
      name: genreLabel,
      value: data.genreNoToName(data.getGenreNoFromSong(uniqueId), lang)
    });
    
    let folderId = data.getEventFromSong(uniqueId);
    if (folderId !== -1) {
      let folderLabel = 'フォルダー';
      if (lang === 1) {
        folderLabel = "Folder";
      }
      fields.push({
        name: folderLabel,
        value: data.folderIdToName(folderId, lang)
      });
    }

    fields.push({
      name: 'Highest Combo',
      value: data.getNoteCountFromSong(uniqueId)[difficulty - 1]
    });
    fields.push({
      name: 'Highest Score',
      value: data.getHighestScoreFromSong(uniqueId)[difficulty - 1]
    });

    if (data.getSongStars(uniqueId, difficulty) === 0) {
      desc = 'This difficulty does not exist.';
      fields = [];
    }

    

    const returnEmbed = {
      title: `${data.getSongName(uniqueId, lang)} | ${taikodb.difficultyIdToName(difficulty, lang)}${bot.difficultyToEmoji(difficulty)}★${data.getSongStars(uniqueId, difficulty)}`,
      description: desc,
      color: 15410003,
      author: {
        name: "Song Statistics"
      },
      timestamp: new Date().toISOString(),
      fields: fields
    };
    await interaction.editReply({ embeds: [returnEmbed] });
  },
};