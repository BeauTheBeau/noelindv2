// Shop manager command

const
    DISCORD = require('discord.js'),
    CONFIG = require('../../backend/config.json'),
    FS = require('fs');

module.exports = {

    data: new DISCORD.SlashCommandBuilder()
        .setName('shop-manager')
        .setDescription('Manage the shop')
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add an item to the shop')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the item')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('description')
                .setDescription('Description of the item')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('price')
                .setDescription('Price of the item')
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName('stock')
                .setDescription('Stock of the item. -1 for infinite')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove an item from the shop')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the item')
                .setRequired(true)
            ))
        .addSubcommand(subcommand => subcommand
            .setName('edit')
            .setDescription('Edit an item in the shop')
            .addStringOption(option => option
                .setName('name')
                .setDescription('Name of the item')
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName('description')
                .setDescription('Description of the item')
                .setRequired(false)
            )
            .addIntegerOption(option => option
                .setName('price')
                .setDescription('Price of the item')
                .setRequired(false)
            )
            .addIntegerOption(option => option
                .setName('stock')
                .setDescription('Stock of the item. -1 for infinite')
                .setRequired(false)
            )),

    async execute(interaction) {

        // Authenticate the user
        if (interaction.guildId !== '1026085612891164732') {
            if (!interaction.member.roles.cache.has('894631600967540838')) return interaction.reply({
                content: 'You do not have permission to use this command',
                ephemeral: true
            });
        }

        const
            SUBCOMMAND = interaction.options.getSubcommand(),
            NAME = interaction.options.getString('name'),
            DESCRIPTION = interaction.options.getString('description'),
            PRICE = interaction.options.getInteger('price'),
            STOCK = interaction.options.getInteger('stock');

        // save shop data to config

        if (SUBCOMMAND === 'add') {

            CONFIG.SHOP[NAME] = {
                description: DESCRIPTION,
                price: PRICE,
                stock: STOCK
            };

            FS.writeFileSync('./backend/config.json', JSON.stringify(CONFIG, null, 4));

            return interaction.reply({
                content: `Added item ${NAME} to the shop | ${DESCRIPTION} | ${PRICE} | ${STOCK}`,
                ephemeral: true
            });

        }
        else if (SUBCOMMAND === 'remove') {

            delete CONFIG.SHOP[NAME];

            FS.writeFileSync('./backend/config.json', JSON.stringify(CONFIG, null, 4));

            return interaction.reply({
                content: `Removed item ${NAME} from the shop`,
                ephemeral: true
            });

        }
        else if (SUBCOMMAND === 'edit') {

            if (!CONFIG.SHOP[NAME]) return interaction.reply({
                content: `Item ${NAME} does not exist in the shop`,
                ephemeral: true
            });

            CONFIG.SHOP[NAME] = {
                description: DESCRIPTION || CONFIG.SHOP[NAME].description,
                price: PRICE || CONFIG.SHOP[NAME].price,
                stock: STOCK || CONFIG.SHOP[NAME].stock
            };

            FS.writeFileSync('./backend/config.json', JSON.stringify(CONFIG, null, 4));

            return interaction.reply({
                content: `Edited item ${NAME} in the shop`,
                ephemeral: true
            });

        }
    }
};