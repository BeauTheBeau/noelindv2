// Shop command

const
    DISCORD = require('discord.js'),
    CONFIG = require('../../backend/config.json'),
    PROFILE_MODEL = require('../../schemas/profile.js');
    FS = require('fs');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('shop')
        .setDescription('Buy items from the shop')

        .addSubcommand(subcommand => subcommand
            .setName('buy')
            .setDescription('Buy an item from the shop')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the item')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('Amount of the item')
                .setRequired(false)
            )
        )

        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('List items in the shop')
        )

        .addSubcommand(subcommand => subcommand
            .setName(`inventory`)
            .setDescription(`View your inventory`)
        ),

    async execute(interaction) {

        const
            USER_ID = interaction.user.id,
            PROFILE = await PROFILE_MODEL.findOne({userID: USER_ID});

        const
            SUBCOMMAND = interaction.options.getSubcommand(),
            NAME = interaction.options.getString('name') || null,
            AMOUNT = interaction.options.getInteger('amount') || 1;

        if (SUBCOMMAND === 'buy') {

            // Check if the item is in the shop
            if (!CONFIG.SHOP[NAME]) return interaction.reply({content: `The item \`${NAME}\` is not in the shop.`, ephemeral: true});
            if (CONFIG.SHOP[NAME].stock <= 0) return interaction.reply({content: `The item \`${NAME}\` is out of stock.`, ephemeral: true});
            if (CONFIG.SHOP[NAME].stock < AMOUNT) return interaction.reply({content: `There is not enough stock of \`${NAME}\`.`, ephemeral: true});
            if (AMOUNT <= 0) return interaction.reply({content: `You must buy at least one of an item.`, ephemeral: true});
            if (PROFILE.xp < CONFIG.SHOP[NAME].price * AMOUNT) return interaction.reply({content: `You do not have enough money to buy \`${NAME}\`.`, ephemeral: true});

            // Check if the user has the item in their inventory
            if (!PROFILE.inventory[NAME]) PROFILE.inventory[NAME] = 0;

            PROFILE.xp -= CONFIG.SHOP[NAME].price * AMOUNT;
            CONFIG.SHOP[NAME].stock -= AMOUNT;

            console.log("inv " + PROFILE.inventory)
            // add to inventory object
            PROFILE.inventory[NAME] += AMOUNT;

            await PROFILE.markModified('inventory');
            await PROFILE.save();
            await FS.writeFileSync('./backend/config.json', JSON.stringify(CONFIG, null, 4));

            return interaction.reply({content: `You bought ${AMOUNT} ${NAME} for ${CONFIG.SHOP[NAME].price * AMOUNT} XP.`, ephemeral: true});
        }

        else if (SUBCOMMAND === 'list') {
            const EMBED = new DISCORD.EmbedBuilder()
                .setTitle('Noelind Shop')
                // description, with item.name, first 16 chars of item.description, item.price and item.stock
                .setDescription(`# Available items\n\n
                ${Object.keys(CONFIG.SHOP).map(item => 
                    `## ${item} 
                    > ${CONFIG.SHOP[item].price}XP • ${CONFIG.SHOP[item].stock.toString() === '-1' ? '∞' : CONFIG.SHOP[item].stock} left
                    > ${CONFIG.SHOP[item].description.slice(0, 16)}\n`).join('')}`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.reply({embeds: [EMBED], ephemeral: true});
        }

        else if (SUBCOMMAND === 'inventory') {
            const EMBED = new DISCORD.EmbedBuilder()
                .setTitle('Your Inventory')
                .setDescription(`# Inventory\n\n
                ${Object.keys(PROFILE.inventory).map(item => 
                    `## ${item} 
                    > ${PROFILE.inventory[item]} left\n`).join('')}`)
                .setColor(0x00FF00)
                .setTimestamp();

            return interaction.reply({embeds: [EMBED], ephemeral: true});
        }
    }
}