## Character
Manage your characters

### Usage
```
Usage:
  character [command] <options>

Available Commands:
    create      Create a new character
        <name>  Name of the character
    delete      Delete a character
        <name>  Name of the character
    select      Select a character as your main character
        <name>  Name of the character
    list        List all characters
```


## Fight
Fight another player

### Usage
```
Usage:
  fight [user] [character]

Available Commands:
    fight  
        - [user]       Username of the user you want to fight
        - [character]  Name of the character you want to fight with
        
```


## Moves
View unlocked moves for your character

### Usage
```
Usage:
  moves [character]

Available Commands:
    moves  
        - <character>  Name of the character you want to view moves for; defaults to your main character
```


## Shop Manager
Manage the server shop

### Usage
```
Usage:
  shop-manager [command] <options>

Available Commands:
    add         Add an item to the shop
        <name>  Name of the item
        <price> Price of the item
    edit        Edit an item in the shop
        <name>  Name of the item
        <price> Price of the item
    remove      Remove an item from the shop
        <name>  Name of the item
```


## Shop
Buy items from the server shop

### Usage
```
Usage:
  shop [command] <options>

Available Commands:
    buy         Buy an item from the shop
        <name>  Name of the item
        [qty]   Quantity of the item to buy
    list        List all items in the shop
```


## XP Manager
Manage user's XP and levels

### Usage
```
Usage:
  xp-manager [command] <options>

Available Commands:
    add         Add XP to a user
        <user>  Username of the user
        <xp>    Amount of XP to add
    remove      Remove XP from a user
        <user>  Username of the user
        <xp>    Amount of XP to remove
    blacklist 
        enable  Enable XP gain for a channel
            - <channel>  Name of the channel
        disable Disable XP gain for a channel
            - <channel>  Name of the channel
        list    List all channels with XP gain disabled
```


## XP

### Usage
```
Usage:
  xp [command] <options>

Available Commands:
    view       View your XP and level
        - [user]  Username of the user you want to view XP for; defaults to yourself
    leaderboard 
        - [page]  Page number of the leaderboard
```

