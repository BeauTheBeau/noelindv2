// Discord bot for the Noelind Discord server
// Using Object-Oriented Programming

// Requires
const
    {Client, Events, GatewayIntentBits, Collection, EmbedBuilder} = require(`discord.js`),
    mongoose = require(`mongoose`),
    profileModel = require(`../schemas/profile.js`),
    FIGHT_MODEL = require('../schemas/fight.js'),
    CONFIG = require('../backend/config.json'),
    FS = require(`fs`);
const MOVES = require("../data/moves.json");


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

// Main
client.once(Events.ClientReady, async () => {

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
    mongoose.connection.on(`connected`, () => {
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

    // Refresh commands
    client.commands.clear();

    // Load commands
    // Loop through all folders in ./commands
    const
        command_folders = require(`fs`).readdirSync(`commands/`),
        event_files = require(`fs`).readdirSync(`events/`).filter(file => file.endsWith(`.js`));

    for (const folder of command_folders) {
        await load_commands(folder);
    }

    switch (interaction.type) {

        case 2:

            const
                command = client.commands.get(interaction.commandName);

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
            console.log(`Button interaction 
            ${interaction.customId} for ${interaction.user.tag} (${interaction.user.id})`);

            // Check if user has a profile
            let profile_data;
            try {
                profile_data = await profileModel.findOne({userID: interaction.user.id});
                if (!profile_data) createProfile(interaction.user.id);
            } catch (err) {
                console.log(err);
                console.log("========================================");
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
                // Load necessary modules and data
                const MOVES = require('../data/moves.json');
                const fightId = interaction.customId.split(`&?f=`)[1];
                const action = interaction.customId.split(`&?f=`)[0].split(`f:`)[1];

                let moveType, moveDamage;

                // Retrieve fight data from the database
                let fightData;
                try {
                    fightData = await FIGHT_MODEL.findOne({combatID: fightId});
                } catch (err) {
                    console.log(err);
                    console.log("========================================");
                }

                // Check if the fight exists and if it is ongoing
                console.log("Checking if fight exists");

                const prechecks = false;
                if (!prechecks) {
                    if (!fightData) {
                        await interaction.reply({
                            content: `This fight doesn't exist!`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (fightData.winner !== null) {
                        await interaction.reply({
                            content: `This fight is over!`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (!fightData.player1.userID || !fightData.player2.userID) {
                        await interaction.reply({
                            content: `This fight is missing a player!`,
                            ephemeral: true
                        });
                        return;
                    }
                    if (fightData.turn !== interaction.user.id.toString()) {
                        await interaction.reply({
                            content: `It's not your turn!`,
                            ephemeral: true
                        });
                        return;
                    }
                }

                // Get the move type and damage based on character rank and action
                const RANKS = Object.keys(MOVES).filter(rank => rank !== "damage_ranges");
                const DAMAGE_RANGES = MOVES.damage_ranges;
                const charRank = profile_data.characters[profile_data.characters.active].rank[1];
                const charRankIndex = RANKS.findIndex(rank => rank === `rank_${charRank}`);

                for (const rank of RANKS) {
                    if (rank === `rank_${charRank}`) {
                        moveType = MOVES[rank].find(move => move.short === action);
                        moveDamage = MOVES[rank].find(move => move.short === action).damage_level;
                        break;
                    }
                }

                if (!moveType) {
                    await interaction.reply({
                        content: `This move isn't unlocked yet! You need to be rank ${RANKS[charRankIndex]} to use it, you're currently rank ${charRank}.`,
                        ephemeral: true
                    });
                    return;
                }

                console.log(moveDamage, moveType)


                // Calculate damage
                const damageRange = DAMAGE_RANGES[`level_${moveDamage}`];
                const damage = Math.floor(Math.random() * (damageRange.max - damageRange.min + 1) + damageRange.min);
                console.log(damageRange, damage);
                console.log("========================================");

                // Get opponent data
                const opponentId = fightData.player1.userID === interaction.user.id.toString() ? fightData.player2.userID : fightData.player1.userID;
                const opponent_data = await profileModel.findOne({userID: opponentId});
                const opponent_char_data = opponent_data.characters[opponent_data.characters.active];
                console.log(opponentId)
                console.table(opponent_char_data);
                console.log(opponent_data.characters[opponent_data.characters.active].health.toString());
                console.log("========================================");

                // Update health
                opponent_char_data.health = [opponent_char_data.health[0] - damage, opponent_char_data.health[1]];
                console.log(opponent_char_data.health.toString());
                console.log("========================================");

                // Check if the opponent is dead
                if (opponent_char_data.health[0] <= 0) {

                    // Set the winner
                    fightData.winner = interaction.user.id.toString();
                    await fightData.save();

                    // Update XP
                    profile_data.xp += opponent_char_data.xp;
                    await profile_data.save();

                    // Send embed
                    const embed = new MessageEmbed()
                        .setColor("#ff0000")
                        .setTitle(`${profile_data.username} won!`)
                        .setDescription(`${profile_data.username} defeated ${opponent_data.username}'s ${opponent_char_data.name} and gained ${opponent_char_data.xp} XP!`)
                        .setTimestamp();

                    await interaction.reply({embeds: [embed]});

                    // Delete the fight from the database
                    await FIGHT_MODEL.deleteOne({combatID: fightId});

                }

                // If the opponent is not dead, switch turns
                else {

                    // Switch turns
                    fightData.turn = opponentId;
                    mongoose.set('debug', true);

                    // Save the fight data
                    console.log("Saving fight data");
                    fightData.player1.character.health = opponent_char_data.health;
                    fightData.markModified('player1.character.health');
                    fightData.markModified('player2.character.health');
                    await fightData.save();

                    console.log("Save successful");

                    // Usernames
                    const username = client.users.cache.get(interaction.user.id).username;
                    const opponent_username = client.users.cache.get(opponentId).username;

                    // Send embed
                    const embed = new EmbedBuilder()
                        .setColor("#ff0000")
                        .setTitle(`${username} used ${moveType.name}!`)
                        .setDescription(`**${username}** dealt **${damage} damage** to ${opponent_username}'s **${opponent_char_data.name}**!`)
                        .setTimestamp();

                    await interaction.reply({embeds: [embed]});
                }
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
});
client.on(Events.MessageCreate, async message => {

    // Ignore messages from bots or blacklisted channels (see config.json and xp-manager.js)
    if (message.author.bot) return;
    if (CONFIG.xp_blacklist.includes(message.channel.id)) return;

    // Add random XP between 12 and 24, modified by message length (if message len is over 50, cap it)
    const
        xp = Math.floor(Math.random() * 12) + 12,
        length_modifier = message.content.length > 50 ? 50 : message.content.length,
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
module.exports = {client: client, createProfile: createProfile};