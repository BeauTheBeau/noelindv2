// Fight command

const
    DISCORD = require('discord.js'),
    MONGOOSE = require('mongoose'),
    PROFILE_MODEL = require('../../schemas/profile.js'),
    FIGHT_MODEL = require('../../schemas/fight.js'),
    MOVES = require('../../data/moves.json');


module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('fight')
        .setDescription('Fight another player')
        .addUserOption(option => option
            .setName('user')
            .setDescription('User to fight')
            .setRequired(true)
        )

        .addStringOption(option => option
            .setName('character')
            .setDescription('Character to fight with')
            .setRequired(true)
        )

        .addBooleanOption(option => option
            .setName("spar")
            .setDescription("Whether or not to spar")
            .setRequired(true)
        ),


    async execute(interaction) {

        const
            USER_ID = interaction.user.id,
            IS_SPAR = interaction.options.getBoolean('spar'),
            OPPONENT_ID = interaction.options.getUser('user').id,
            CHARACTER = interaction.options.getString('character'),
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID}),
            OPPONENT_PROFILE = await PROFILE_MODEL.findOne({userID: OPPONENT_ID}),
            TYPE = IS_SPAR ? 'spar' : 'fight';

        // Prechecks
        await interaction.reply({
            content: `:mag: :ballot_box_with_check: :ballot_box_with_check: Conducting prechecks...`,
            ephemeral: true
        });

        if (!PROFILE) return interaction.editReply({
            content: 'You do not have a profile yet! Create one with /character create',
            ephemeral: true
        });
        if (!OPPONENT_PROFILE) return interaction.editReply({
            content: 'That user does not have a profile yet!',
            ephemeral: true
        });
        if (!PROFILE.characters.active) return interaction.editReply({
            content: 'You do not have an active character! Set one with /character select',
            ephemeral: true
        });
        if (!OPPONENT_PROFILE.characters[CHARACTER]) return interaction.editReply({
            content: 'That user does not have that character!',
            ephemeral: true
        });

        await interaction.editReply({
            content: `:white_check_mark::ballot_box_with_check::ballot_box_with_check: Prechecks passed, setting up ${type}...`,
            ephemeral: true
        });

        const
            FIGHT = await FIGHT_MODEL.findOne({userID: USER_ID});

        if (FIGHT) return interaction.editReply({
            content: `You are already in a fight!`,
            ephemeral: true
        });

        // Loop through all fights (dictionary) and check if either of the users are in a fight
        // If they are, return an error
        // If they aren't, create a new fight

        for (const FIGHT of await FIGHT_MODEL.find()) {
            if (FIGHT.player1.userID === USER_ID || FIGHT.player2.userID === USER_ID) {
                if (FIGHT.winner === null) return interaction.editReply({
                    content: `You are already in a ${type}!`,
                    ephemeral: true
                });
            }

            if (FIGHT.player1.userID === OPPONENT_ID || FIGHT.player2.userID === OPPONENT_ID) {
                if (FIGHT.winner === null) return interaction.editReply({
                    content: `That user is already in a ${type}!`,
                    ephemeral: true
                });
            }
        }

        const
            COMBAT_ID = `${USER_ID}-${OPPONENT_ID}-${Date.now()}`,
            PLAYER1 = {
                userID: USER_ID,
                character: PROFILE.characters[PROFILE.characters.active],
            },
            PLAYER2 = {
                userID: OPPONENT_ID,
                character: OPPONENT_PROFILE.characters[CHARACTER],
            },
            FIGHT_DATA = {
                combatID: COMBAT_ID,
                player1: PLAYER1,
                player2: PLAYER2,
                turn: interaction.user.id.toString(),
                winner: null,
                loser: null,
                p1hp: 100,
                p2hp: 100,
                history: [],
                p1turn: true,
                p2turn: false
            },
            NEW_FIGHT = new FIGHT_MODEL(FIGHT_DATA);

        await NEW_FIGHT.save();
        console.log("SAVED!")


        // await PROFILE_MODEL.findOneAndUpdate({userID: USER_ID},
        //     { $inc: { 'characters.$[character].stats.fights': 1 } },
        //     { arrayFilters: [ { 'character.name': PROFILE.characters[PROFILE.characters.active].name } ] }
        // );

        // Send the reply and create a thread
        const
            THREAD = await interaction.channel.threads.create({
                name: `Fight: ${PROFILE.characters[PROFILE.characters.active].name} vs ${OPPONENT_PROFILE.characters[CHARACTER].name}`,
                autoArchiveDuration: 60,
                reason: `${type} thread`
            }),
            THREAD_ID = THREAD.id;

        // add both players to the thread
        await THREAD.members.add(USER_ID);
        await THREAD.members.add(OPPONENT_ID);

        // Create buttons for fight moves
        const
            RANK_1 = new DISCORD.ActionRowBuilder(),
            RANK_2 = new DISCORD.ActionRowBuilder(),
            RANK_3 = new DISCORD.ActionRowBuilder(),
            RANK_4 = new DISCORD.ActionRowBuilder(),
            RANK_5 = new DISCORD.ActionRowBuilder(),
            ALL = new DISCORD.ActionRowBuilder();

        let
            RANK_1_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 1+')
                    .setCustomId('f:rank_1')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
            ],
            RANK_2_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 2+')
                    .setCustomId('f:rank_2')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
            ],
            RANK_3_BUTTONS = [

                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 3+')
                    .setCustomId('f:rank_3')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
            ],
            RANK_4_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 4+')
                    .setCustomId('f:rank_4')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
            ],
            RANK_5_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('Rank 5+')
                    .setCustomId('f:rank_5')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
            ],
            ALL_BUTTONS = [
                await new DISCORD.ButtonBuilder()
                    .setLabel('All Ranks')
                    .setCustomId('f:all')
                    .setStyle(DISCORD.ButtonStyle.Primary)
                    .setDisabled(true),
                await new DISCORD.ButtonBuilder()
                    .setLabel(`Surrender`)
                    .setCustomId(`f:surrender&?f=${COMBAT_ID}&isSpar=${IS_SPAR}`)
                    .setStyle(DISCORD.ButtonStyle.Danger),
                await new DISCORD.ButtonBuilder()
                    .setLabel(`Draw`)
                    .setCustomId(`f:force&?f=${COMBAT_ID}&isSpar=${IS_SPAR}`)
                    .setStyle(DISCORD.ButtonStyle.Danger)
            ]

        let ALL_MOVES = []

        for (let RANK in MOVES) {

            if (RANK === "success" || RANK === "damage_ranges") continue;
            console.log(RANK)

            let move_short, move_long;

            // RANK is an array of moves
            for (let MOVE of MOVES[RANK]) {

                move_short = MOVE.short
                move_long = MOVE.name
                const ID = `f:${move_short}&?f=${COMBAT_ID}&isSpar=${IS_SPAR}`

                // Check for the ID in ALL MOVES
                for (let i = 0; i < ALL_MOVES.length; i++) {
                    if (ALL_MOVES[i].id === ID) MOVES[RANK].splice(i, 1)
                }

                ALL_MOVES.push(ID)

                console.log(`> f:${move_short}&?f=${COMBAT_ID}&isSpar=${IS_SPAR}`)

                const
                    buttonPromise = new Promise(async (resolve, reject) => {
                        const BUTTON = await new DISCORD.ButtonBuilder()
                            .setCustomId(`f:${move_short}&?f=${COMBAT_ID}&isSpar=${IS_SPAR}`)
                            .setLabel(`${move_long}`)
                            .setStyle(DISCORD.ButtonStyle.Primary);

                        resolve(BUTTON);
                    });

                // Check for any de

                console.log(RANK)

                switch (RANK) {
                    case "rank_1":
                        RANK_1_BUTTONS.push(await buttonPromise);
                        break;
                    case "rank_2":
                        RANK_2_BUTTONS.push(await buttonPromise);
                        break;
                    case "rank_3":
                        RANK_3_BUTTONS.push(await buttonPromise);
                        break;
                    case "rank_4":
                        RANK_4_BUTTONS.push(await buttonPromise);
                        break;
                    case "rank_5":
                        RANK_5_BUTTONS.push(await buttonPromise);
                        break;
                }
            }
        }


        RANK_1.addComponents(RANK_1_BUTTONS);
        RANK_2.addComponents(RANK_2_BUTTONS);
        RANK_3.addComponents(RANK_3_BUTTONS);
        RANK_4.addComponents(RANK_4_BUTTONS);
        RANK_5.addComponents(RANK_5_BUTTONS);
        ALL.addComponents(ALL_BUTTONS);

        await interaction.editReply({
            content: `:white_check_mark::white_check_mark::ballot_box_with_check: Setting up buttons...`,
            ephemeral: true
        })

        // Send the fight embed
        const
            EMBED = new DISCORD.EmbedBuilder()
                .setTitle(`Fight: ${PLAYER1.character.name} and ${PLAYER2.character.name}`)
                .setDescription(`${type.charAt(0).toUpperCase() + type.slice(1)} started between <@${USER_ID}>'s ${PLAYER1.character.name} and <@${OPPONENT_ID}>'s ${PLAYER2.character.name}\n# History
                - No history yet`)
                .setTimestamp();

        EMBED.addFields(
            {
                name: `${PLAYER1.character.name} HP`,
                value: `${FIGHT_DATA.player1.character.health[0]}/100`,
                inline: true
            },
            {
                name: `${PLAYER2.character.name} HP`,
                value: `${FIGHT_DATA.player2.character.health[0]}/100`,
                inline: true
            },
            {
                name: `Turn`,
                value: `It's <@${USER_ID}>'s turn (${PLAYER1.character.name})`,
                inline: true
            },
        );

        // Link to the thread
        await interaction.editReply({
            content: `Created a thread for the ${type}: <#${THREAD_ID}>`,
            ephemeral: true
        });

        await THREAD.send({
            content: `${type.charAt(0).toUpperCase() + type.slice(1)}  started between <@${USER_ID}>'s ${PLAYER1.character.name} and <@${OPPONENT_ID}>'s ${PLAYER2.character.name}`,
            components: [ALL]
        });

        return THREAD.send({embeds: [EMBED], components: [RANK_1, RANK_2, RANK_3, RANK_4, RANK_5]});
    }
}
