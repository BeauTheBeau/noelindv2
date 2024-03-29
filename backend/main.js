// Discord bot for the Noelind Discord server
// Using Object-Oriented Programming

// Requires
const
    {
        Client,
        Events,
        GatewayIntentBits,
        Collection,
        ButtonBuilder,
        EmbedBuilder,
        ButtonStyle,
        ActionRowBuilder
    } = require(`discord.js`),
    mongoose = require(`mongoose`),
    profileModel = require(`../schemas/profile.js`),
    fightModel = require('../schemas/fight.js'),
    CONFIG = require('../backend/config.json'),
    FS = require(`fs`);
const PROFILE_MODEL = require("../schemas/profile");
// const MOVES = require("../data/moves.json");

const rank_thresholds = [200, 400, 800, 1100, 1400];

const temp1 = 2;
const tempt2 = 54
const temp3 = true;
console.log(temp1 < 0 || temp3 && tempt2 <= 60)

require(`dotenv`).config();

// Variables
const
    TOKEN = process.env.TOKEN,
    client = new Client({
        intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b, 0),
    });

client.commands = new Collection();

// Functions
function createProfile(userID) {

    // Setup user's profile
    // See ../schemas/profile.js

    let profile = new profileModel({
        userID: userID,
        xp: 0,
        level: 0,
        characters: {active: null},
        inventory: {},
        combat: {active: false, combatID: null}
    });

    profile.save().catch(err => console.log(err));

    console.log(`Created profile for ${userID}`);
    console.log("========================================");
}


async function load_commands(category) {

    const
        command_files = require(`fs`).readdirSync(`commands/${category}/`).filter(file => file.endsWith(`.js`)),
        START_TIME = Date.now();

    for (const file of command_files) {
        const
            command = require(`../commands/${category}/${file}`),
            command_name = file.split('.')[0];
        client.commands.set(command_name, command);
    }


    console.log(`Loaded ${command_files.length} ${category} commands`);
    console.log(`Took ${Date.now() - START_TIME}ms`);
    console.log("========================================");
}

// Damage a character if they haven't eaten in a while
const thresholds = [0, 0, 0, 2, 3, 4, 11, 14, 14, 18, 21, 25, 28, 32, 35, 39, 42, 46, 49, 53, 56, 60, 63, 67, 70, 74, 77, 81, 84, 88, 91, 95, 98, 100];

async function damageCharacter(name, userID) {
    const userData = await profileModel.findOne({userID: userID});
    const character = userData.characters[name];
    if (!character) return;

    const epochs = {
        "ate": character.last.ate,
        "tookDamage": character.last.damageFromNotEating || 0,
        "days": ((Date.now() - character.last.ate) / 86400)
    }

    const damage = thresholds[Math.floor(epochs.days)] || 100;

    const embed = new EmbedBuilder()
        .setTitle(`${name} needs to eat!`)

    if (epochs.days > 3) return;

    // Apply damage
    character.health[0] -= damage;

    // Check if character is dead
    if (character.health[0] <= 0) {
        character.health[0] = 0;
        character.alive = false;
        embed.setDescription(`${name} has died from starvation!`);
    } else embed.setDescription(`${name} has taken ${damage} damage from not eating for ${Math.floor(epochs.days)} days! Do </character eat:1108133163273814066> to eat!`);

    character.last.damageFromNotEating = Date.now();
    await PROFILE_MODEL.findOneAndUpdate({userID: userID}, {$set: {[`characters.${name}`]: character}});

    const user = await client.users.fetch(userID);
    const optOut = await profileModel.findOne({userID: userID, "settings.optOut": true});
    if (optOut) return;

    const optOutButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setLabel("Opt Out of Notifications")
        .setCustomId("optOut");

    const row = new ActionRowBuilder()
        .addComponents(optOutButton);

    try {
        await user.send({embeds: [embed], components: [row]});
    } catch (err) {
        console.log(err);
    }
    console.log(`${name} has taken ${damage} damage from not eating for ${Math.floor(epochs.days)} days!`);
}

// Cron jobs
// Check if characters need to eat
const CronJob = require('cron').CronJob;
const eatJob = new CronJob('0 0 * * *', async () => {
    const profiles = await profileModel.find({});
    for (const profile of profiles) {
        for (const character in profile.characters) {
            await damageCharacter(character, profile.userID);
        }
    }
}, null, true, 'Europe/London');
eatJob.start();

const healJob = new CronJob('0 0 * * *', async () => {
    const profiles = await profileModel.find({});
    for (const profile of profiles) {
        for (const character in profile.characters) {
            const characterData = profile.characters[character];
            if (characterData.health[0] < characterData.health[1]) {
                characterData.health[0] += 1;
                await PROFILE_MODEL.findOneAndUpdate({userID: profile.userID}, {$set: {[`characters.${character}`]: characterData}});
            }

            if (characterData.health[0] > characterData.health[1]) {
                characterData.health[0] = characterData.health[1];
                await PROFILE_MODEL.findOneAndUpdate({userID: profile.userID}, {$set: {[`characters.${character}`]: characterData}});
            }

        }
    }
}, null, true, 'Europe/London');

healJob.start();

// Main
client.on(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Connect to MongoDB
    mongoose.connect(process.env.MONGODB_SRC, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    // Load commands
    // Loop through all folders in ./commands
    const
        command_folders = require(`fs`).readdirSync(`commands/`),
        event_files = require(`fs`).readdirSync(`events/`).filter(file => file.endsWith(`.js`));

    for (const folder of command_folders) {
        await load_commands(folder);
    }

    // Load events
    for (const file of event_files) {
        const event = require(`events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }

    console.log(`Loaded ${event_files.length} events`);
    console.log(`Loaded ${client.commands.size} commands`);
    console.log("========================================");

    // Log in notice
    console.log(`Successfully logged in as ${client.user.tag}`);
    console.log("========================================");

    // Connect to MongoDB
    await mongoose.connection.on(`connected`, () => {
        console.log(`Connected to MongoDB`);
        console.log("========================================");
    });
});
client.on(Events.InteractionCreate, async interaction => {

    let profile_data;

    try {
        profile_data = await profileModel.findOne({userID: interaction.user.id});
        if (!profile_data) createProfile(interaction.user.id);
    } catch (err) {
        console.log(err);
        console.log("========================================");
    }

    switch (interaction.type) {

        case 2:

            const command = client.commands.get(interaction.commandName);

            try {
                console.log(`Executing command ${interaction.commandName} for ${interaction.user.tag} (${interaction.user.id})`);
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `There was an error while executing this command! This incident has been reported. Error: \`\`\`${error.stack}\`\`\``,
                    ephemeral: false
                });
            }
            break;

        case 3:
            console.log(`Button interaction  ${interaction.customId} for ${interaction.user.tag} (${interaction.user.id})`);

            // Check if user has a profile
            let profile_data;
            try {
                profile_data = await profileModel.findOne({userID: interaction.user.id});
                if (!profile_data) createProfile(interaction.user.id);
            } catch (err) {
                console.log(err);
                console.log("========================================");
            }

            // opt in/out
            if (interaction.customId === "optOut") {

                // check if the setting exists
                if (!profile_data.settings.optOut) profile_data.settings.optOut = true;
                else profile_data.settings.optOut = !profile_data.settings.optOut;

                await profile_data.save();

                const optInButton = new ButtonBuilder()
                    .setStyle(ButtonStyle.Primary)
                    .setLabel("Opt Back In to Notifications")
                    .setCustomId("optIn");

                const row = new ActionRowBuilder()
                    .addComponents(optInButton);

                await interaction.reply({
                    content: "You have opted out of notifications!",
                    ephemeral: false,
                    components: [row]
                });
            }
            if (interaction.customId === "optIn") {
                profile_data.settings.optOut = false;
                await profile_data.save();
                await interaction.reply({
                    content: "You have opted back in to notifications!",
                    ephemeral: true
                });
            }

            // Check if user has a character
            if (!profile_data.characters.active) {
                await interaction.reply({
                    content: `You don't have a character! Create one with \`/create\``,
                    ephemeral: true
                });
                return;
            }

            // =========================================================================================================
            // === FIGHT BUTTONS === FIGHT BUTTONS === FIGHT BUTTONS === FIGHT BUTTONS === FIGHT BUTTONS === FIGH... ===
            // =========================================================================================================

            if (interaction.customId.startsWith(`f:`)) {

                // =================
                // Prepare Variables

                // Get fight data
                let fight_data;
                let opponent_data, my_data;
                let opponent_char, my_char;
                let p1id, p2id, timestamp;

                const xp = {
                    win: 70,
                    lose: 40,
                    draw: 40,
                    surrender: 40
                }

                // Get fight ID and other relevant data
                const
                    fightID = interaction.customId.split(`&?f=`)[1].split(`&isSpar=`)[0],
                    move = interaction.customId.split(`&`)[0].split(`:`)[1],
                    isSpar = interaction.customId.split(`&`)[1].split(`=`)[1] === `true`,
                    type = isSpar ? `spar` : `fight`;


                if (type === "spar") {

                    const today = new Date();
                    if (opponent_data.lastSparDate && opponent_data.lastSparDate.toDateString() === today.toDateString()) {
                        if (opponent_data.sparCount >= 2) {
                            await interaction.reply({
                                content: 'You cannot spar more than twice per day.',
                                ephemeral: true
                            });
                            return;
                        }
                    } else {
                        opponent_data.sparCount = 0;
                        opponent_data.lastSparDate = today;
                    }

                }

                try {
                    fight_data = await fightModel.findOne({combatID: fightID});
                } catch (err) {
                    console.log(err);
                    console.log("========================================");

                    await interaction.reply({
                        content: `There was an error while executing this command! This incident has been reported.`,
                        ephemeral: false
                    });
                    return interaction.followUp({
                        content: `\`\`\`${err.stack}\`\`\``
                    });
                }

                if (!fight_data) {
                    await interaction.reply({
                        content: `This ${type} does not exist! (\`${interaction.customId}\`)`,
                        ephemeral: true
                    });
                    return;
                }

                // =================
                // Check if fight is over or has been force stopped

                if (fight_data.winner === "force_stopped") {
                    await interaction.reply({
                        content: `This ${type} has been force stopped!`,
                        ephemeral: true
                    });
                    return;
                }

                if (fight_data.winner !== null) {
                    await interaction.reply({
                        content: `This ${type} is already over, ${fight_data.winner} won!`,
                        ephemeral: true
                    });
                    return;
                }

                if (fightID.split(`-`)[0] !== interaction.user.id && fightID.split(`-`)[1] !== interaction.user.id) {
                    await interaction.reply({
                        content: `You are not in this ${type}! It is between <@${fightID.split(`-`)[0]}> and <@${fightID.split(`-`)[1]}>`,
                        ephemeral: true
                    });
                    return;
                } else {
                    p1id = fightID.split(`-`)[0];
                    p2id = fightID.split(`-`)[1];
                    timestamp = fightID.split(`-`)[2];
                }

                if (fight_data.turn !== interaction.user.id.toString()) {
                    await interaction.reply({
                        content: `It's not your turn!`,
                        ephemeral: true
                    });
                    return;
                }

                // =================
                // Get User Data from fight data using ternary operator
                my_data = fight_data.player1.userID === interaction.user.id ? fight_data.player1 : fight_data.player2;
                opponent_data = fight_data.player1.userID === interaction.user.id ? fight_data.player2 : fight_data.player1;

                // =================
                // Get Character Data from user data using ternary operator
                my_char = fight_data.player1.userID === interaction.user.id ? fight_data.player1.character : fight_data.player2.character;
                opponent_char = fight_data.player1.userID === interaction.user.id ? fight_data.player2.character : fight_data.player1.character;

                // =================
                // Check if the move is "surrender" or "force"

                if (move === "surrender") {

                    // Set winner to opponent / loser to me
                    fight_data.winner = opponent_data.userID;
                    fight_data.loser = my_data.userID;

                    // Update the user.characters[active].stats.surrenders
                    my_char.stats.surrender += 1;
                    my_char.stats.losses += 1;
                    my_char.stats.fights += 1;
                    my_char.rank[0] += xp.surrender;

                    my_char.last.surrender = Date.now();
                    my_char.last.fight = Date.now();
                    my_char.last.loss = Date.now();

                    opponent_char.stats.wins += 1;
                    opponent_char.stats.fights += 1;
                    opponent_char.last.win = Date.now();
                    opponent_char.last.fight = Date.now();
                    opponent_char.rank[0] += xp.win;

                    try {
                        await fight_data.save();

                        const my_profile = await profileModel.findOne({userID: my_data.userID});
                        const opponent_profile = await profileModel.findOne({userID: opponent_data.userID});

                        my_profile.characters[my_char.name] = my_char;
                        opponent_profile.characters[opponent_char.name] = opponent_char;

                        await my_profile.markModified(`characters.${my_char.name}.stats`);
                        await my_profile.markModified(`characters.${my_char.name}.last`);
                        await opponent_profile.markModified(`characters.${opponent_char.name}.stats`);
                        await opponent_profile.markModified(`characters.${opponent_char.name}.last`);

                        await my_profile.save();
                        await opponent_profile.save();

                        await interaction.reply({
                            content: `<@${opponent_data.userID}> won! <@${my_data.userID}> surrendered!`,
                        });
                        await interaction.followUp({
                            content: `# XP Rewards\n<@${opponent_data.userID}>: 70 XP\n<@${my_data.userID}>: 40 XP`
                        });

                        // Add to history
                        const
                            history = await fight_data.history,
                            history_entry = {
                                "turn": [my_char.name, opponent_char.name],
                                "move": move,
                                "damage": 0,
                                // "injury": "nothing",
                                "success": success
                            };

                        history.push(history_entry);
                        fight_data.history = history;
                        await fight_data.markModified("history");
                        await fight_data.save();

                        // make it human readable
                        let history_text = "";

                        for (let i = 0; i < history.length; i++) {
                            history_text += `${i + 1}. **${history[i].turn[0]}** used **${history[i].move}** and dealt **${history[i].damage}** damage!`;
                            if (i !== history.length - 1) history_text += "\n";
                        }

                        return await interaction.followUp({content: `# History \n${history_text}`});

                    } catch (err) {
                        console.log(err);
                        console.log("========================================");

                        await interaction.reply({
                            content: `There was an error while surrendering! This incident has been reported.`,
                            ephemeral: false
                        });

                        return interaction.followUp({
                            content: `\`\`\`${err.stack}\`\`\``
                        });
                    }

                }
                if (move === "force") {

                    // Set winner to opponent / loser to me
                    fight_data.winner = "force_stopped";
                    fight_data.loser = "force_stopped";

                    // Update the user.characters[active].stats.draws
                    my_char.stats.draws += 1;
                    my_char.last.draw = Date.now();
                    my_char.rank[0] += xp.draw;

                    opponent_char.stats.draws += 1;
                    opponent_char.last.draw = Date.now();
                    opponent_char.rank[0] += xp.draw;


                    try {
                        await fight_data.save();

                        const my_profile = await profileModel.findOne({userID: my_data.userID});
                        const opponent_profile = await profileModel.findOne({userID: opponent_data.userID});

                        my_profile.characters[my_char.name] = my_char;
                        opponent_profile.characters[opponent_char.name] = opponent_char;

                        await my_profile.markModified(`characters.${my_char.name}.stats`);
                        await my_profile.markModified(`characters.${my_char.name}.last`);
                        await opponent_profile.markModified(`characters.${opponent_char.name}.stats`);
                        await opponent_profile.markModified(`characters.${opponent_char.name}.last`);

                        await my_profile.save();
                        await opponent_profile.save();

                        fight_data.winner = "force_stopped";
                        fight_data.loser = "force_stopped";

                        await fight_data.save();

                        // Award XP
                        await interaction.reply({
                            content: `# XP Rewards\n<@${opponent_data.userID}>: 40 XP\n<@${my_data.userID}>: 40 XP`
                        });

                        my_char.rank[0] += 40;
                        opponent_char.rank[0] += 40;

                        await my_profile.markModified(`characters.${my_char.name}.rank`);
                        await opponent_profile.markModified(`characters.${opponent_char.name}.rank`);
                        await my_profile.save();
                        await opponent_profile.save();

                        await interaction.followUp({content: `# The ${type} ended in a draw!`});
                        const og_message = await interaction.message
                        const og_embed = await og_message.embeds[0]

                        const new_embed = EmbedBuilder.from(og_embed)
                            .setTitle(`Force stopped - draw`)

                        // Edit message
                        return await og_message.edit({
                            embeds: [new_embed]
                        })


                    } catch (err) {
                        console.log(err);
                        console.log("========================================");

                        await interaction.reply({
                            content: `There was an error while drawing! This incident has been reported.`,
                            ephemeral: false
                        });

                        return interaction.followUp({
                            content: `\`\`\`${err.stack}\`\`\``
                        });
                    }
                }


                // =================
                // Get move details

                const MOVES_MODEL = require('../schemas/move.js')
                // const moves = require(`../data/moves.json`)

                let move_data; let rank = my_char.rank[1];

                for (let i = 1; i < rank; i++) {
                    const curmove = await MOVES_MODEL.findOne({name: move, rank: i});
                    if (curmove) {
                        move_data = curmove;
                        break;
                    }
                }

                if (!move_data) {
                    return interaction.reply({
                        content: `That move doesn't exist (or I did an oopsie)`,
                        ephemeral: true
                    });
                }

                // =================
                // Calculate damage
                // Get ranges from moves.damage_ranges

                const
                    damage_range = move_data.damage_level,
                    damage_ranges = {
                        "level_1": {
                            "min": 1,
                            "max": 9
                        },
                        "level_2": {
                            "min": 5,
                            "max": 11
                        },
                        "level_3": {
                            "min": 9,
                            "max": 13
                        },
                        "level_4": {
                            "min": 13,
                            "max": 17
                        },
                        "level_5": {
                            "min": 17,
                            "max": 21
                        }
                    },
                    damage = Math.floor(Math.random() * (damage_ranges.max - damage_ranges.min + 1)) + damage_ranges.min,
                    // injury = move_data.possible_injuries[Math.floor(Math.random() * move_data.possible_injuries.length)],
                    success_rate = move_data.success_rate,
                    success = Math.floor(Math.random() * success_rate) === 0;

                // =================
                // DO THE THING

                // If the move was successful, do the thing
                if (!success) {

                    // If the move was successful, do the thing
                    interaction.reply({
                        content: `${my_char.name} tried to use **${move_data.name}** but failed!`,
                        ephemeral: false
                    });

                    // Change turn to opponent (as string) and save
                    fight_data.turn = opponent_data.userID
                    await fight_data.save();

                } else {

                    // If the move was successful, do the thing
                    interaction.reply({
                        content: `${my_char.name} used **${move_data.name}** and dealt **${damage}** damage!`,
                        ephemeral: false
                    });

                    // Deal damage to the opponent
                    opponent_char.health[0] -= damage;

                }

                if (my_data.userID === fight_data.player1.userID) fight_data.player2.character = opponent_char;
                else fight_data.player1.character = opponent_char;

                await interaction.channel.send({
                    content: `DEBUG | ${opponent_char.name}'s health: ${opponent_char.health[0]} - <= 0: ${opponent_char.health[0] <= 0} - isSpar: ${isSpar} - opponent_char.health[0] <= 60: ${opponent_char.health[0] <= 60}`
                })

                // Check if opponent is dead
                if (opponent_char.health[0] <= 0 || isSpar && opponent_char.health[0] <= 60) {
                    // If so, end the fight
                    await interaction.followUp({
                        content: `${opponent_char.name} has been defeated!`,
                        ephemeral: false
                    });

                    // Update  the fight data
                    fight_data.winner = my_data.userID;
                    fight_data.loser = opponent_data.userID;

                    // Update the profile models
                    const
                        my_profile = await profileModel.findOne({userID: my_data.userID}),
                        opponent_model = await profileModel.findOne({userID: opponent_data.userID});

                    my_profile.characters[my_char.name] = my_char;
                    opponent_model.characters[opponent_char.name] = opponent_char;

                    await my_profile.markModified("characters." + my_char.name);

                    // Add to history
                    const
                        history = await fight_data.history,
                        history_entry = {
                            "turn": [my_char.name, opponent_char.name],
                            "move": move,
                            "damage": damage,
                            // "injury": injury,
                            "success": success
                        };

                    history.push(history_entry);
                    fight_data.history = history;
                    await fight_data.markModified("history");
                    await fight_data.save();

                    // make it human-readable
                    let history_text = "";

                    for (let i = 0; i < history.length; i++) {
                        history_text += `${i + 1}. **${history[i].turn[0]}** used **${history[i].move}** and dealt **${history[i].damage}** damage!`;
                        if (i !== history.length - 1) history_text += "\n";
                    }

                    // If the history exceeds 4000 characters, split it into multiple embeds
                    if (history_text.length > 4000) {

                        const
                            history_embed_1 = new EmbedBuilder()
                                .setTitle(`${type} History`)
                                .setDescription(history_text.slice(0, 4000))
                                .setTimestamp(),
                            history_embed_2 = new EmbedBuilder()
                                .setDescription(history_text.slice(4000, history_text.length))
                                .setTimestamp();

                        await interaction.followUp({embeds: [history_embed_1]});
                        return await interaction.followUp({embeds: [history_embed_2]});
                    }
                }

                // Change turn to opponent (as string) and save
                fight_data.turn = opponent_data.userID

                await fight_data.markModified("player1.character");
                await fight_data.markModified("player2.character");
                await fight_data.save();

                // Replicate changes to the profile models
                const
                    my_profile = await profileModel.findOne({userID: my_data.userID}),
                    opponent_model = await profileModel.findOne({userID: opponent_data.userID});

                my_profile.characters[my_char.name] = my_char;
                opponent_model.characters[opponent_char.name] = opponent_char;

                if (type === "spar") {
                    opponent_data.sparCount += 1;
                    await opponent_data.save();
                    opponent_profile = await profileModel.findOne({userID: opponent_data.userID});
                    opponent_profile.characters[opponent_char.name] = opponent_char;
                    await opponent_profile.markModified(`characters.${opponent_char.name}.stats`);
                    await opponent_profile.markModified(`characters.${opponent_char.name}.last`);
                    await opponent_profile.save();
                }

                await my_profile.markModified("characters." + my_char.name);
                await my_profile.save();
                await opponent_model.markModified("characters." + opponent_char.name);
                await opponent_model.save();

                // Get the original message
                const original_message = await interaction.message;
                const embed = original_message.embeds[0];
                if (my_data.userID === fight_data.player1.userID) {
                    embed.fields[0].value = `${my_char.health[0]}/${my_char.health[1]}`;
                    embed.fields[1].value = `${opponent_char.health[0]}/${opponent_char.health[1]}`;
                } else {
                    embed.fields[0].value = `${opponent_char.health[0]}/${opponent_char.health[1]}`;
                    embed.fields[1].value = `${my_char.health[0]}/${my_char.health[1]}`;
                }

                embed.fields[2].value = `<@${opponent_data.userID}>'s turn`;

                // Edit the original message
                await original_message.edit({embeds: [embed]});
                await interaction.followUp({embeds: [embed]});

                // Add to history
                const
                    history = await fight_data.history,
                    history_entry = {
                        "turn": [my_char.name, opponent_char.name],
                        "move": move,
                        "damage": damage,
                        "success": success
                    };

                history.push(history_entry);
                fight_data.history = history;
                await fight_data.markModified("history");
                await fight_data.save();

                // make it human-readable
                let history_text = "";
                for (let i = 0; i < history.length; i++) {
                    history_text += `${i + 1}. **${history[i].turn[0]}** used **${history[i].move}** and dealt **${history[i].damage}** damage!`;
                    if (i !== history.length - 1) history_text += "\n";
                }
                return await interaction.followUp({content: `# History \n${history_text}`});

            }

            break;


        default:
            interaction.reply({
                content: `Unknown interaction type ${interaction.type}. This incident has been reported.`,
                ephemeral: true
            });
            console.log(`Unknown interaction type ${interaction.type}`);
            console.log("========================================");
            break;
    }
})
client.on(Events.MessageCreate, async message => {

    // Ignore messages from bots or blacklisted channels (see config.json and xp-manager.js)
    if (message.author.bot) return;
    if (CONFIG.xp_blacklist.includes(message.channel.id)) return;

    // Add random XP between 12 and 24, modified by message length (if message len is over 70, cap it)
    const
        xp = Math.floor(Math.random() * 12) + 12,
        length_modifier = message.content.length > 70 ? 70 : message.content.length,
        xp_modifier = Math.floor(length_modifier / 10),
        total_xp = xp + xp_modifier;

    // Check if user has a profile
    let profile_data;
    try {
        profile_data = await profileModel.findOne({userID: message.author.id});
        if (!profile_data) createProfile(message.author.id);

    } catch (err) {
        console.log(err);
        console.log("========================================");
    }

    // Add XP to user's profile
    try {
        await profileModel.findOneAndUpdate(
            {
                userID: message.author.id
            },
            {
                $inc: {
                    xp: total_xp
                }
            }
        );

        console.log(`Added ${total_xp} XP to ${message.author.id}`);

    } catch (err) {
        console.log(err);
        console.log("========================================");
    }
});


// Handlers
process.on(`unhandledRejection`, err => {
    console.log(`Unhandled promise rejection`);
    console.error(err.stack);
    console.log("========================================");
});
process.on(`uncaughtException`, err => {
    console.log(`Uncaught exception`);
    console.error(err.stack);
    console.log("========================================");
});


// Login
try {
    client.login(TOKEN);
} catch (err) {
    console.log(`Failed to login to Discord!`);
    console.error(err.stack);
    console.log("========================================");
}

// Export
module.exports = {client: client, createProfile: createProfile, damageCharacter: damageCharacter};