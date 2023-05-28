require('dotenv').config();

const
    {REST, Routes} = require('discord.js'),
    FS = require('node:fs'),
    TOKEN = process.env.TOKEN,
    CLIENT_ID = process.env.CLIENT_ID,
    COMMANDS = [];


// For each directory in project_dir/COMMANDS
FS.readdirSync('commands').forEach(dir => {

    // Loop through each file in the directory
    FS.readdirSync(`commands/${dir}`).forEach(file => {
        if (!file.endsWith('.js')) return;
        console.log(`Loading command ${file} from ${dir}`)
        file = require(`../commands/${dir}/${file}`)
        COMMANDS.push(file.data.toJSON())
        console.log(`Loaded command ${file.data.name} from ${dir}`)
    });
});


const rest = new REST({version: '10'}).setToken(TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${COMMANDS.length} application (/) COMMANDS.`);

        // Fully refresh all COMMANDS in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            {body: COMMANDS},
        );

        console.log(`Successfully reloaded ${data.length} application (/) COMMANDS.`);
    }
    catch (error) {
        console.error(error);
    }
})();