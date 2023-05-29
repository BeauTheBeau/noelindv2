// Discord bot for the Noelind Discord server
// Using Object-Oriented Programming

// Requires
const
    {Client, Events, GatewayIntentBits, Collection, EmbedBuilder} = require(`discord.js`),
    mongoose = require(`mongoose`),
    profileModel = require(`../schemas/profile.js`),
    fightModel = require('../schemas/fight.js'),
    CONFIG = require('../backend/config.json'),
    FS = require(`fs`);
// const MOVES = require("../data/moves.json");


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

                // =================
                // Prepare Variables

                // Custom ID
                // f:basic_bite&?f=[fight id]-<timestamp>
                // Fight ID
                // <player 1 id>-<player 2 id>-<timestamp>

                // Get fight data
                let fight_data;
                let opponent_data, my_data;
                let opponent_char, my_char;
                let p1id, p2id, timestamp;


                // Get fight ID and other relevant data
                const
                    fightID = interaction.customId.split(`&?f=`)[1],
                    move = interaction.customId.split(`&`)[0].split(`:`)[1];

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
                        content: `This fight doesn't exist!`,
                        ephemeral: true
                    });
                    return;
                }

                // =================
                // Check if fight is over or has been force stopped

                if (fight_data.winner === "force_stopped") {
                    await interaction.reply({
                        content: `This fight has been force stopped!`,
                        ephemeral: true
                    });
                    return;
                }
                if (fight_data.winner !== null) {
                    await interaction.reply({
                        content: `This fight is already over, ${fight_data.winner} won!`,
                        ephemeral: true
                    });
                    return;
                }
                if (fightID.split(`-`)[0] !== interaction.user.id && fightID.split(`-`)[1] !== interaction.user.id) {
                    await interaction.reply({
                        content: `You are not in this fight! It is between <@${fightID.split(`-`)[0]}> and <@${fightID.split(`-`)[1]}>`,
                        ephemeral: true
                    });
                    return;
                } else {
                    p1id = fightID.split(`-`)[0];
                    p2id = fightID.split(`-`)[1];
                    timestamp = fightID.split(`-`)[2];
                }
                // check if it is their turn
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
                    my_char.stats.surrenders += 1;
                    my_char.stats.losses += 1;
                    my_char.stats.fights += 1;
                    my_char.last.surrender = Date.now();
                    my_char.last.fight = Date.now();


                    opponent_char.stats.wins += 1;
                    opponent_char.stats.fights += 1;
                    opponent_char.last.win = Date.now();
                    opponent_char.last.fight = Date.now();

                    try {
                        await fight_data.save();

                        const my_profile = await profileModel.findOne({userID: my_data.userID});
                        const opponent_profile = await profileModel.findOne({userID: opponent_data.userID});

                        my_profile.characters[my_char.name] = my_char;
                        opponent_profile.characters[opponent_char.name] = opponent_char;

                        await my_profile.markModified("characters");
                        await opponent_profile.markModified("characters");

                        await my_profile.save();
                        await opponent_profile.save();



                        await interaction.reply({
                            content: `<@${opponent_data.userID}> won! <@${my_data.userID}> surrendered!`,
                        });
                        await interaction.followUp({
                            content: `# XP Rewards\n<@${opponent_data.userID}>: 50 XP\n<@${my_data.userID}>: 20 XP`
                        });

                        // Add to history
                        const
                            history = await fight_data.history,
                            history_entry = {
                                "turn": [my_char.name, opponent_char.name],
                                "move": move,
                                "damage": damage,
                                "injury": injury,
                                "success": success
                            };

                        history.push(history_entry);
                        fight_data.history = history;
                        await fight_data.markModified("history");
                        await fight_data.save();

                        // make it human readable
                        let history_text = "";

                        for (let i = 0; i < history.length; i++) {
                            history_text += `${i + 1}. **${history[i].turn[0]}** used **${history[i].move}** and dealt **${history[i].damage}** damage, causing **${history[i].injury}**!`;
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

                    try {
                        await fight_data.save();
                        await interaction.reply({
                            content: `The fight has been force stopped, no XP will be rewarded.`,
                        });

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

                const moves = {
                    "damage_ranges": {
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
                    "rank_1": [
                        {
                            "short": "basic_bite",
                            "name": "Basic Bite",
                            "possible_injuries": [
                                "Minor bite wound",
                                "Infection from bite",
                                "None",
                                "None",
                                "None",
                            ],
                            "action_text": [
                                "<opponent> was bitten with viciously sharp fangs by <self>, dealing <damage> damage!",
                                "<self> bit <opponent> with viciously sharp fangs, dealing <damage> damage!",
                                "<opponent> was bitten with viciously sharp fangs by <self>, dealing <damage> damage and causing <injury>!",
                                "<self> bit <opponent> with viciously sharp fangs, dealing <damage> damage and causing <injury>!"
                            ],
                            "fail_text": [
                                "<self> tried to bite <opponent>, but missed!",
                                "<self> tried to bite <opponent>, but missed and fell over!",
                                "<opponent> dodged <self>'s bite, causing <self> to fall over!"
                            ],
                            "damage_level": 1,
                            "success_rate": 3
                        },
                        {
                            "short": "basic_claw",
                            "name": "Basic Claw",
                            "possible_injuries": [
                                "Minor scratch",
                                "Infection from scratch",
                                "None",
                                "None",
                                "None",
                                "None",
                            ],
                            "action_text": [
                                "<opponent> was scratched by <self>, dealing <damage> damage!",
                                "<self> scratched <opponent>, dealing <damage> damage!",
                                "<opponent> was scratched by <self>, dealing <damage> damage and causing <injury>!",
                                "<self> scratched <opponent>, dealing <damage> damage and causing <injury>!"
                            ],
                            "fail_text": [
                                "<self> tried to scratch <opponent>, but missed!",
                                "<self> tried to scratch <opponent>, but missed and fell over!",
                                "<opponent> dodged <self>'s scratch, causing <self> to fall over!"
                            ],
                            "damage_level": 1,
                            "success_rate": 3
                        }
                    ],
                    "rank_2": [
                        {
                            "short": "tackle",
                            "name": "Tackle",
                            "possible_injuries": [
                                "Minor bruising",
                                "Minor scratch",
                                "Medium scratch",
                                "Medium bruising",
                                "None",
                                "None",
                                "None",
                                "None",
                                "None",
                                "None",
                            ],
                            "action_text": [
                                "<opponent> was tackled by <self>, dealing <damage> damage!",
                                "<self> tackled <opponent>, dealing <damage> damage!",
                                "<opponent> was tackled by <self>, dealing <damage> damage and causing <injury>!",
                                "<self> tackled <opponent>, dealing <damage> damage and causing <injury>!"
                            ],
                            "fail_text": [
                                "<self> tried to tackle <opponent>, but missed!",
                                "<self> tried to tackle <opponent>, but missed and fell over!",
                                "<opponent> dodged <self>'s tackle, causing <self> to fall over!"
                            ],
                            "damage_level": 1,
                            "success_rate": 3
                        },
                        {
                            "short": "throw",
                            "name": "Throw",
                            "possible_injuries": [
                                "Minor bruising",
                                "Minor scratch",
                                "Medium scratch",
                                "Medium bruising",
                                "None",
                                "None",
                                "None",
                                "None",
                                "None",
                                "None",
                            ],
                            "action_text": [
                                "<self> propelled <opponent> through the air, dealing <damage> damage!",
                                "<self> threw <opponent>, dealing <damage> damage!",
                                "<opponent> was propelled through the air by <self>, dealing <damage> damage and causing <injury>!",
                                "<self> threw <opponent>, dealing <damage> damage and causing <injury>!"
                            ],
                            "fail_text": [
                                "<self> tried to throw <opponent>, couldn't get a good grip!",
                                "<self> tried to throw <opponent>, but <opponent> wiggled free!"
                            ],
                            "damage_level": 2,
                            "success_rate": 2
                        }
                    ],
                    "rank_3": [
                        {
                            "short": "biteshake",
                            "name": "Bite n' Shake",
                            "possible_injuries": [
                                "Minor bite wound",
                                "Medium bite wound",
                                "Infection from bite",
                                "None",
                                "None"
                            ],
                            "action_text": [
                                "<opponent> was bitten and tossed around by <self>, dealing <damage> damage and causing <injury>!",
                                "<self> bit <opponent> and shook them around, dealing <damage> damage and causing <injury>!",
                                "<opponent> got bitten and tossed around by <self>, dealing <damage> damage and causing <injury>!",
                                "<self> bit <opponent> and shook them around, dealing <damage> damage and causing <injury>!"
                            ],
                            "fail_text": [
                                "<self> bit <opponent> and tried to shake them around, but couldn't get a good grip!",
                                "<self> bit <opponent> and tried to shake them around, but <opponent> wiggled free of their grasp!",
                                "<self> tried to bite <opponent> and shake them around, but missed!"
                            ],
                            "damage_level": 2,
                            "success_rate": 1
                        }
                    ]
                }

                // =================
                // Get move details


                // First, get the character's rank

                let move_data;

                const
                    rank = my_char.rank[1];

                // Loop through the moves and find the move with the matching short name, assign it to move_data

                for (let i = 0; i < moves[`rank_${rank}`].length; i++) {
                    if (moves[`rank_${rank}`][i].short === move) {
                        move_data = moves[`rank_${rank}`][i];
                    }
                }

                // =================
                // Calculate damage
                // Get ranges from moves.damage_ranges

                const
                    damage_range = move_data.damage_level,
                    damage_ranges = moves.damage_ranges[`level_${damage_range}`],
                    damage = Math.floor(Math.random() * (damage_ranges.max - damage_ranges.min + 1)) + damage_ranges.min,
                    injury = move_data.possible_injuries[Math.floor(Math.random() * move_data.possible_injuries.length)],
                    success_rate = move_data.success_rate, // scale of 1 - 3 (1 = high, 3 = low)
                    success = true;

                // =================
                // DO THE THING

                // If the move was successful, do the thing
                if (!success) {

                    // If the move was successful, do the thing
                    interaction.reply({
                        content: move_data.fail_text[Math.floor(Math.random() * move_data.fail_text.length)]
                            .replace("<self>", my_char.name)
                            .replace("<opponent>", opponent_char.name)
                            .replace("<damage>", damage)
                            .replace("<injury>", injury),
                        ephemeral: false
                    });

                    // Change turn to opponent (as string) and save
                    fight_data.turn = opponent_data.userID
                    await fight_data.save();

                } else {

                    // If the move was successful, do the thing
                    interaction.reply({
                        content: move_data.action_text[Math.floor(Math.random() * move_data.action_text.length)]
                            .replace("<self>", `**${my_char.name}**`)
                            .replace("<opponent>", `**${opponent_char.name}**`)
                            .replace("<damage>", `**${damage}**`)
                            .replace("<injury>", `**${injury}**`),
                        ephemeral: false
                    });

                    // Deal damage to the opponent
                    opponent_char.health[0] -= damage;

                }

                if (my_data.userID === fight_data.player1.userID) fight_data.player2.character = opponent_char;
                else fight_data.player1.character = opponent_char;

                // Check if opponent is dead
                if (opponent_char.health[0] <= 0) {

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
                            "injury": injury,
                            "success": success
                        };

                    history.push(history_entry);
                    fight_data.history = history;
                    await fight_data.markModified("history");
                    await fight_data.save();

                    // make it human-readable
                    let history_text = "";

                    for (let i = 0; i < history.length; i++) {
                        history_text += `${i + 1}. **${history[i].turn[0]}** used **${history[i].move}** and dealt **${history[i].damage}** damage, causing **${history[i].injury}**!`;
                        if (i !== history.length - 1) history_text += "\n";
                    }

                    // If the history exceeds 4000 characters, split it into multiple embeds
                    if (history_text.length > 4000) {

                            const
                                history_embed_1 = new EmbedBuilder()
                                    .setTitle("Fight History")
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
                        "injury": injury,
                        "success": success
                    };

                history.push(history_entry);
                fight_data.history = history;
                await fight_data.markModified("history");
                await fight_data.save();

                // make it human readable
                let history_text = "";

                for (let i = 0; i < history.length; i++) {
                    history_text += `${i + 1}. **${history[i].turn[0]}** used **${history[i].move}** and dealt **${history[i].damage}** damage, causing **${history[i].injury}**!`;
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