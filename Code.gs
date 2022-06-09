function doGet() {
  return HtmlService.createHtmlOutputFromFile('Interface');
}

function getOrganisationData() {
  const query = '"Apps Script" stars:">=100"';
  const url = 'https://sandbox.dissco.tech/api/v1/organisation/tuples' + '?sort=stars' + '&q=' + encodeURIComponent(query);

  const response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
  const data = JSON.parse(response.getContentText());
  
  let check = [];
  let numberCheck = {};
  let returnArray = [];

  /* Check for double entities */
  for (key in data) {
    if (!check.includes(data[key]['name'])) {
      check.push(data[key]['name']);
      numberCheck[data[key]['name']] = 1;
    } else {
      numberCheck[data[key]['name']] += 1;
      data[key]['name'] = data[key]['name'] + ' (' + numberCheck[data[key]['name']] + ')';
    }

    returnArray[data[key]['name']] = data[key];
  }

  return returnArray;
}

function fillMonkeyForm(auth, survey_id, page = 1) {
  /* Check if page is greater than zero */
  if (!page > 0) {
    page = 1;
  }
    
  const organisationData = getOrganisationData();

  /* Find form data */
  // findMonkeyForm(auth, process);

  findMonkeyPage(auth, survey_id, page, process_further);
  /* Process form id, find page data */
  // function process(survey_data) {
  //   let survey_id = survey_data.id;
  // }

  /* Process page data, insert organisation multiple choice */
  function process_further(survey_id, page_data) {
    /* Set multiple choice options */
    let choices = [];

    for (key in organisationData) {
      choices.push({
        "text": key
      })
    }

    /* Add field to form */
    let data = {
      "family": "matrix",
      "subtype": "menu",
      "answers": {
        "rows":[{
          "text": "Organisation:"
        }],
        "cols":[{
          "text": "Choose",
          "choices": choices
        }]
      },
      "headings": [
        {
          "heading": "Choose a DiSSCo Organisation:"
        }
      ]
    }

    let options = {
      'method' : 'post',
      'headers':{'Authorization':'bearer ' + auth},
      'contentType': 'application/json',
      // Convert the JavaScript object to a JSON string.
      'payload' : JSON.stringify(data),
    };

    let response = UrlFetchApp.fetch('https://api.surveymonkey.com/v3/surveys/' + survey_id + '/pages/' + page_data.id + '/questions', options);
  }
}

function getMonkeyForms(auth) {
  let options = {
      'method' : 'GET',
      'headers':{'Authorization':'Bearer ' + auth},
      'contentType': 'application/json'
    };

  let response = UrlFetchApp.fetch('https://api.surveymonkey.com/v3/surveys', options);
  let data = JSON.parse(response.getContentText());
  
  return data;
}

function findMonkeyForm(auth, survey_id, callback) {
  let survey_data;

  let options = {
    'method' : 'GET',
    'headers':{'Authorization':'bearer ' + auth},
    'contentType': 'application/json'
  };
  let result = UrlFetchApp.fetch('https://api.surveymonkey.net/v3/surveys/' + survey_id, options);
  if (result.getResponseCode() == 200) {
    let params = JSON.parse(result.getContentText());
  }

  callback(survey_data);
}

function findMonkeyPage(auth, survey_id, page = 1, callback) {
  let options = {
    'method' : 'get',
    'headers':{'Authorization':'bearer ' + auth},
    'contentType': 'application/json'
  };

  let response = UrlFetchApp.fetch('https://api.surveymonkey.com/v3/surveys/' + survey_id + '/pages', options);
  let params = JSON.parse(response.getContentText());

  let page_data = params.data[(page - 1)];

  callback(survey_id, page_data);
}

function fillGoogleForm(form_id) {
  /* Receiving organisations from API */
  const organisationData = getOrganisationData();

  form_id = '1FrPOiVcSh4TSxtPcO-Il3pbdTO8noW-AgyhNMbMA86Y';

  /* Opening form */
  let form = FormApp.openById(form_id);

  /* Setting drop down item with API */
  let o = form.addListItem();
  choices = [];

  for (key in organisationData) {
    choices.push(o.createChoice(key));
  }

  o.setChoices(choices);
  o.setTitle('Choose a DiSSCo Organisation:');
}


/* Read data from forms */
function exportGoogleForm(form_id) {
  form_id = '1FrPOiVcSh4TSxtPcO-Il3pbdTO8noW-AgyhNMbMA86Y';

  /* Retrieve organisations with ROR id */
  let organisationsData = getOrganisationData();

  let form = FormApp.openById(form_id);

  let responses = {};

  var formResponses = form.getResponses();

  // var formResponses = form.getResponses();
  // for (var i = 0; i < formResponses.length; i++) {
  //   var formResponse = formResponses[i];
  //   var itemResponses = formResponse.getItemResponses();
  //   for (var j = 0; j < itemResponses.length; j++) {
  //     var itemResponse = itemResponses[j];
  //     Logger.log('Response #%s to the question "%s" was "%s"',
  //         (i + 1).toString(),
  //         itemResponse.getItem().getTitle(),
  //         itemResponse.getResponse());
  //   }
  // }

  for (var i = 0; i < formResponses.length; i++) {
    responses['response: ' + i] = {
      'answers': {}
    };

    var formResponse = formResponses[i];
    var itemResponses = formResponse.getItemResponses();

    for (var j = 0; j < itemResponses.length; j++) {
      var itemResponse = itemResponses[j];
    
      if (itemResponse.getItem().getTitle() == 'Choose a DiSSCo Organisation:') {
        let ror = organisationsData[itemResponse.getResponse()]['ror'];
        
        if (!responses['response: ' + i][itemResponse.getItem().getTitle()]) {
          responses['response: ' + i][itemResponse.getItem().getTitle()] = [ror];
        } else {
          responses['response: ' + i][itemResponse.getItem().getTitle()].push(ror);
        }
      } else {
        if (!responses['response: ' + i]['answers'][itemResponse.getItem().getTitle()]) {
          responses['response: ' + i]['answers'][itemResponse.getItem().getTitle()] = [itemResponse.getResponse()];
        } else {
          responses['response: ' + i]['answers'][itemResponse.getItem().getTitle()].push(itemResponse.getResponse());
        }
      }
    }
  }

  return responses;
}

function exportMonkeyForm(survey_id, auth) {
  survey_id = '401528179';
  auth = 'tOt-QCvM5tKO73Krcx3Kwabq7XEnp9u9N091e8DdW3A48oVMAPyb4wvUKBnhCs8D.T1f4im-5OeeFTel3bXjwNGQkE.hLL7G-OxyGj3S5JN6au436ciazOmxB3Tz5wxc';

  let options = {
    'method' : 'GET',
    'headers':{'Authorization':'bearer ' + auth},
    'contentType': 'application/json'
  };
  let result = UrlFetchApp.fetch('https://api.surveymonkey.net/v3/surveys/' + survey_id + '/responses/bulk?simple=true', options);
  if (result.getResponseCode() == 200) {
    let params = JSON.parse(result.getContentText());
    let data = params['data'];

    let organisationsData = getOrganisationData();
    let responses = {};
    let i = 0;

    for (key in data) {
      responses['response: ' + i] = {
        'answers': {}
      };
      
      let responseIndicator = 'response: ' + i;
      let respondent = data[key];

      for (key in respondent['pages']) {
        let page = respondent['pages'][key];

        for (key in page['questions']) {
          let question = page['questions'][key];

          if (question.heading == 'Choose a DiSSCo Organisation:') {
            let organisationText = question['answers'][0]['simple_text'].replace('Organisation: | Choose | ', '');
            let ror = organisationsData[organisationText]['ror'];

            if (!responses[responseIndicator][question['heading']]) {
              responses[responseIndicator][question['heading']] = [ror];
            } else {
              responses[responseIndicator][question['heading']].push(ror);
            }
          } else {
            if (!responses[responseIndicator]['answers'][question['heading']]) {
              responses[responseIndicator]['answers'][question['heading']] = [question['answers'][0]['simple_text']];
            } else {
              responses[responseIndicator]['answers'][question['heading']].push(question['answers'][0]['simple_text']);
            }
          }
        }
      }

      i++;
    }

    return responses;
  }
}

function readMonkeyForm(auth, survey_id) {
  let options = {
      'method' : 'post',
      'headers':{'Authorization':'bearer ' + auth},
      'contentType': 'application/json',
      // Convert the JavaScript object to a JSON string.
      'payload' : JSON.stringify(data),
    };

  let response = UrlFetchApp.fetch('https://api.surveymonkey.com/v3/surveys/' + survey_id + '/responses');

  console.log(response);
}