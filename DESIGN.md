# Sportfeed DESIGN

# Branding Label
The very top of each page has the label "Sportfeed" which is coded as an HTML header.  The label is linked with an href to the homepage.

# Sport Scores Banner
Below the branding label is an area where the sport game scores are displayed in a ul list.  Each li item is a div container that formats the game information.  The list of sport game scores is dynamically created by scraping scores from https://www.scorespro.com.  The red heart on each sport game box is a button that adds a row to the "Likes" table in the sqlite database.  The order of the sport game scores displayed is determined by the number of likes each user has on each sport.  The number of likes is queried from the sqlite database from the table "Likes."  We ordered the events based on total likes of each sport to display the sports the user is most likely trying to react to at the beginning of the banner so the user does not need to scroll. In our proposal, we had planned to have a different page for each sport to display game scores, but we shifted instead to the sport game scores banner of all scores that is at the top of every page (homepage and each chat room).  We experimented with having various pages for each sport, but after some personal user testing, we decided that the banner was better than separate sport pages because the website is meant for discussion to all sports, which can be talked about together.  The omnipresent sport scores banner also allows the user to see continually updating stream of events displayed in every chat room.

# Copyright © 2017 Matty Cheng & Clara Duffy
