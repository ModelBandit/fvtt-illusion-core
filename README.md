# fvtt illusion core

### English
## about
This module serves as the mainframe for using the 'illusion' module. It primarily handles UI-related tasks.
## features
* Player state control UI
* Localization(en/ko)
## Usage
<img width="965" alt="image" src="https://github.com/user-attachments/assets/c206aebf-097a-42bb-af23-d159f472f33e" /><br>
make world -> setting -> add modules -> configure setting
select your language (If your language isn't available, you can add a JSON file to the `lang` folder to use it.)

<img width="700" alt="image" src="https://github.com/user-attachments/assets/62c6ea89-b2ee-44d1-9de2-5805fbb1f502" /><br>
You can select the recipients for the fake messages using the checkboxes and make them visible by activating the toggle button.
Chat module is required for this UI to function correctly.

<img width="400" alt="image" src="https://github.com/user-attachments/assets/0f772531-7478-41f1-8373-acf644f60e44" /><br>
Selecting one or more players as message recipients enables Chat Interception. 
The GM can intercept messages sent by non-selected players, modify the sender name and message content, and then send the modified message.
This UI also requires the Chat module.

## Extensions
* <a href="https://github.com/ModelBandit/fvtt-illusion-chat"> fvtt-illusion-chat </a><br>
<img width="378" alt="ezgif-58425df0f76b86ec" src="https://github.com/user-attachments/assets/e1642e9e-c53f-4471-882b-84979633a533" /><br>

## Requirements
* Foundry VTT v12<br>
## License
MIT License
