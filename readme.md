# NodeJS Literotica Scraper

This is a NodeJS script that scrapes stats for stories on the adult website Literotica and stores them as a timetable in a MySQL database. It can generate charts from the data for all time and for the last 24 hours.
## Usage
### Prerequisites

Before using this script, you must have the following installed:

- NodeJS
- NPM
- MySQL

### Installation

- Clone this repository to your local machine.
- Run `npm install` to install the necessary dependencies.
- Create a `.env` file based on the provided `example.env` file, and modify the values as necessary.

### Running the script

To run the script, use the following command:

```bash
node crawler.js
```
Database tables will be created automatically if they do not exist.
If a User Data is provided in the `.env` file, the script will attempt to log in to the site and scrape stats for stories that the user has published.

### Add public series to crawl

To add a series to the list of series to crawl, use the following command:  
__Note:__ The series id can be found in the URL of the series page. For example, the series id for the series `https://www.literotica.com/series/se/123` is `123`.  
__Warning:__ Do not add a series that is owned by the user that is logged in. This will cause the stats to be scraped twice.  
```bash
node add.js <series id>
```

### Generating charts

To generate charts from the scraped data, use the following command:

```bash
node chart_all.js
```

This will generate charts for all time and for the last 24 hours. And place them in `./charts/<series name>/`.
Stories without a Series will be added to the pseudo-series `No Series`.

## License

This project is licensed under the MIT License. See the LICENSE file for more information.