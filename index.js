/*jshint esversion: 6, node: true */

'use strict';

const chalk = require('chalk');
const fs = require('fs');
const clear = require('clear');
const keypress = require('keypress');
const figlet = require('figlet');
const debug = require('debug')('index');
const Q = require('q');

const TITLE = '[title]';
const SUBHEADER = '[subheader]';
const ASCIIART = '[asciiart]';
const BODY = '[body]';

let currentSlide = 0;
let slides = [];
let currentSlideContent = [];
let currentSlideConfig = {};

let lineCounter = 0;

function incrementSlide() {
  clearSlideContent();
  if (currentSlide < (slides.length - 1)) {
    ++currentSlide;
  }
  return slides[currentSlide];
}

function decrementSlide() {
  clearSlideContent();
  if (currentSlide > 0) {
    --currentSlide;
  }
  return slides[currentSlide];
}

function clearSlideContent() {
  currentSlideContent = [];
}

function extractContent(line, type) {
  return line.substring(0, line.indexOf(type));
}

function addSlideContent(line, type) {
  if (type == BODY) {
    currentSlideContent.push({
      type: type,
      content: line
    });
  } else {
    currentSlideContent.push({
      type: type,
      content: extractContent(line, type)
    });
  }
}

// Read a given slide
function readSlide(slide) {
  return Q.Promise((resolve, reject) => {
    debug('reading slide', slide.file);
    currentSlideConfig = slide;
    const lineReader = require('readline').createInterface({
      input: require('fs').createReadStream(slide.file)
    });

    lineReader.on('line', (line) => {
      if (line.indexOf(TITLE) > -1) {
        debug('reading title content');
        addSlideContent(line, TITLE);
      } else if(line.indexOf(SUBHEADER) > -1) {
        debug('reading subheader content');
        addSlideContent(line, SUBHEADER);
      } else if(line.indexOf(ASCIIART) > -1) {
        debug('reading asciiart content');
        addSlideContent(line, ASCIIART);
      } else {
        debug('reading body content');
        addSlideContent(line, BODY);
      }
    });

    lineReader.on('close', () => {
      debug('input stream closed');
      resolve();
    });
  });
}

function printLine() {
  return Q.Promise((resolve, reject) => {
    let aLine = currentSlideContent[lineCounter];
    let printContent;
    switch (aLine.type) {
      case TITLE:
        debug('printing title content');
        printContent = chalk[currentSlideConfig.color.title](aLine.content);
        break;
      case SUBHEADER:
        debug('printing subheader content');
        printContent = chalk[currentSlideConfig.color.subheader](aLine.content);
        break;
      case ASCIIART:
        printContent = null;
        debug('printing asciiart content');
        syncFiglet(aLine.content)
        .then((data) => {
          console.log(chalk[currentSlideConfig.color.asciiart](data));
          resolve();
        });
        break;
      case BODY:
        debug('printing body content');
        printContent = chalk[currentSlideConfig.color.body](aLine.content);
        break;
      default:
        debug('printing default content');
        printContent = chalk[currentSlideConfig.color.body](aLine.content);
    }
    if (printContent !== null) {
      console.log(printContent);
    }
    resolve();
  });
}

function goPrint() {
  return Q.Promise((resolve, reject) => {
    printLine(lineCounter)
    .then(() => {
      if (lineCounter < currentSlideContent.length) {
        ++lineCounter;
        goPrint();
      } else {
        resolve();
      }
    });
  });
}

function showCurrentSlide() {
  clear();
  console.log('SLIDE: ' + (currentSlide + 1) + '/' + slides.length + '\n');
  lineCounter = 0;
  goPrint().done();
}

function syncFiglet(line) {
  return Q.Promise((resolve, reject) => {
    figlet(line, (err, data) => {
      if (err) {
        console.log('something went wrong...');
        console.log(err);
        reject(new Error(err));
      }
      resolve(data);
    });
  });
}


// Read the config file and show the first slide
fs.readFile('./config.js', 'utf8', (err, data) => {
  if (err) throw err;
  const config = JSON.parse(data);
  config.slides.forEach((slide) => {
    slides.push(slide);
  });
  // show the first slide
  readSlide(slides[currentSlide])
  .then(() => {
    showCurrentSlide();
  })
  .done();
});

keypress(process.stdin);
process.stdin.on('keypress', (ch, key) => {
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause();
  } else if ((key.name == 'right') || (key.name == 'space')) {
    readSlide(incrementSlide())
    .then(() => {
      showCurrentSlide();
    })
    .done();
  } else if (key.name == 'left') {
    readSlide(decrementSlide())
    .then(() => {
      showCurrentSlide();
    })
    .done();
  }
});


process.stdin.setRawMode(true);
process.stdin.resume();
