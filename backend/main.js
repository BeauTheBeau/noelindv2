// Discord bot for the Noelind Discord server
// Using Object-Oriented Programming

// Requires
const
    { Client, Events, GatewayIntentBits, Collection, EmbedBuilder } = require(`discord.js`),
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
        characters: { active: null },
        inventory: {},
        combat: { active: false, combatID: null }
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
        profile_data = await profileModel.findOne({ userID: interaction.user.id });
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
            console.log(`Button interaction ${interaction.customId} for ${interaction.user.tag} (${interaction.user.id})`);

            // Check if user has a profile
            let profile_data;
            try {
                profile_data = await profileModel.findOne({ userID: interaction.user.id });
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

            // Check if the button is for a fight
            let fight_id, action;
            if (interaction.customId.startsWith(`f:`)) {

                const
                    MOVES = require('../data/moves.json');

                fight_id = interaction.customId.split(`&?f=`)[1];
                action = interaction.customId.split(`&?f=`)[0].split(`f:`)[1];

                // Get the fight ID (after &?f=)
                // Looks like this: f:(action)&?f=(fight_id)
                console.log("Getting fight ID: " + fight_id);

                // Get the fight data
                let fight_data;
                try {
                    fight_data = await FIGHT_MODEL.findOne({combatID: fight_id});
                } catch (err) {
                    console.log(err);
                    console.log("========================================");
                }

                // Check if the fight exists
                console.log("Checking if fight exists");
                if (!fight_data) {
                    await interaction.reply({
                        content: `This fight doesn't exist!`,
                        ephemeral: true
                    });
                    return;
                }
                if (fight_data.winner !== null) {
                    await interaction.reply({
                        content: `This fight is over!`,
                        ephemeral: true
                    });
                    return;
                }
                if (!fight_data.player1.userID || !fight_data.player2.userID) {
                    await interaction.reply({
                        content: `This fight is missing a player!`,
                        ephemeral: true
                    });
                    return;
                }
                if (fight_data.turn !== interaction.user.id.toString()) {
                    await interaction.reply({
                        content: `It's not your turn!`,
                        ephemeral: true
                    });
                    return;
                }
                console.log("Fight exists");
                console.log("Checking if move is unlocked");

                let
                    move_type,
                    move_damage,
                    RANKS = Object.keys(MOVES).filter(rank => rank !== "damage_ranges"),
                    DAMAGE_RANGES = MOVES.damage_ranges;

                // get char rank
                const
                    char_rank = profile_data.characters[profile_data.characters.active].rank[1],
                    char_rank_index = RANKS.findIndex(rank => rank === `rank_${char_rank}`);

                // "damage_ranges": {
                //     "damage_level": { min : 1, max : 5 },
                //     }

                for (const rank of RANKS) {
                    if (rank === `rank_${char_rank}`) {
                        move_type = MOVES[rank].find(move => move.short === action);
                        move_damage = MOVES[rank].find(move => move.short === action).damage_level;
                        break;
                    }
                }

                if (!move_type) {
                    await interaction.reply({
                        content: `This move isn't unlocked yet! You need to be rank ${RANKS[char_rank_index]} to use it, you're currently rank ${char_rank}.`,
                        ephemeral: true
                    });
                    return;
                }

                console.log("Move is unlocked");


                // Deal damage to the opponent

                // Get the opponent's character data
                let opponent_data;
                try { opponent_data = await profileModel.findOne({ userID: fight_data.player1.userID }); }
                catch (err) {
                    console.log(err);
                    console.log("========================================");
                }

                if (fight_data.player1.userID === interaction.user.id.toString()) {
                    try {
                        opponent_data = await profileModel.findOne({userID: fight_data.player2.userID});
                    } catch (err) {
                        console.log(err);
                        console.log("========================================");
                    }
                }

                // Get the opponent's character data
                let opponent_char_data;

                try { opponent_char_data = opponent_data.characters[opponent_data.characters.active]; }
                catch (err) {
                    console.log(err);
                    console.log("========================================");
                }

                const
                    damage_range = DAMAGE_RANGES[`level_${move_damage}`];
                    damage = Math.floor(Math.random() * (damage_range.max - damage_range.min + 1)) + damage_range.min;

                opponent_char_data.health -= damage;

                // Check if the opponent is dead
                if (opponent_char_data.health <= 0) {

                    fight_data.winner = interaction.user.id.toString();
                    fight_data.loser = opponent_data.userID;

                    // Add XP to the winner and add a win to their char stasts
                    const
                        xp = Math.floor(Math.random() * 12) + 12;

                    profile_data.xp += xp;
                    profile_data.characters[profile_data.characters.active].stats.wins += 1;
                    profile_data.characters[profile_data.characters.active].rank[0] += xp;

                    if (profile_data.characters[profile_data.characters.active].rank[0] >= 100) {
                        profile_data.characters[profile_data.characters.active].rank[0] = 0;
                        profile_data.characters[profile_data.characters.active].rank[1] += 1;
                    }

                    // Add a loss to the loser's char stats
                    opponent_data.characters[opponent_data.characters.active].stats.losses += 1;
                    opponent_data.characters[profile_data.characters.active].rank[0] += xp / 4;

                    if (opponent_data.characters[profile_data.characters.active].rank[0] >= 100) {
                        opponent_data.characters[profile_data.characters.active].rank[0] = 0;
                        opponent_data.characters[profile_data.characters.active].rank[1] += 1;
                    }

                    // Save the data
                    try {
                        await profile_data.save();
                        await opponent_data.save();
                        await fight_data.save();
                    }
                    catch (err) {
                        console.log(err);
                        console.log("========================================");
                    }

                    // Send the embed
                    const
                        embed = new MessageEmbed()
                            .setColor("RED")
                            .setTitle("Fight Over!")
                            .setDescription(`${interaction.user.username} has defeated ${opponent_data.username}!`)
                            .addFields(
                                { name: `${interaction.user.username}'s ${profile_data.characters[profile_data.characters.active].name}`, value: `Health: ${profile_data.characters[profile_data.characters.active].health}`, inline: true },
                                { name: `${opponent_data.username}'s ${opponent_data.characters[opponent_data.characters.active].name}`, value: `Health: ${opponent_data.characters[opponent_data.characters.active].health}`, inline: true },
                            )
                            .setTimestamp()

                    await interaction.reply({ embeds: [embed] });
                }

                else {

                    // send embed detailing the move
                    const
                        embed = new EmbedBuilder()
                            .setTitle(`${interaction.user.username} used ${move_type.name}!`)
                            .setDescription(`${interaction.user.username} dealt ${damage} damage to ${opponent_data.username}'s ${opponent_char_data.name}!`)
                            .addFields(
                                { name: `${interaction.user.username}'s ${profile_data.characters[profile_data.characters.active].name}`, value: `Health: ${profile_data.characters[profile_data.characters.active].health}`, inline: true },
                                { name: `${opponent_data.username}'s ${opponent_data.characters[opponent_data.characters.active].name}`, value: `Health: ${opponent_data.characters[opponent_data.characters.active].health}`, inline: true },
                            )
                            .setTimestamp()

                    await interaction.reply({ embeds: [embed] });

                    // Save the data
                    try {
                        await profile_data.save();
                        await opponent_data.save();
                        await fight_data.save();
                    }
                    catch (err) {
                        console.log(err);
                        console.log("========================================");
                    }
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
        profile_data = await profileModel.findOne({ userID: message.author.id });
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
    console.log(`Unhandled promise rejection: ${err}`);
    console.log("========================================");
});
process.on(`uncaughtException`, err => {
    console.log(`Uncaught exception: ${err}`);
    console.log("========================================");
});


// Login
try {
    client.login(TOKEN);
}
catch (err) {
    console.log(`Failed to login to Discord!`);
    console.log(err);
    console.log("========================================");
}

// Export
module.exports = { client: client, createProfile: createProfile }