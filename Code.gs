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

function postOrganisationData(formData, callback) {
  /* For each response to form, insert new record */
  const query = '"Apps Script" stars:">=100"';
  let url = 'https://sandbox.dissco.tech/api/v1/organisation/document' + '?sort=stars' + '&q=' + encodeURIComponent(query);
  let options = {
    'method': 'POST',
    'contentType': 'application/json'
  }

  for (let response in formData) {
    let document = {
      'organisation_id': formData[response]['organisation_id'],
      'document_id': formData[response]['form_id'],
      'document_title': formData[response]['form_title'],
      'document_type': formData[response]['form_type'],
      'document': formData[response]['questions']
    };

    options['payload'] = JSON.stringify(document);

    UrlFetchApp.fetch(url, options);
  }

  callback(true);
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
  /* Retrieve organisations with ROR id */
  let organisationsData = getOrganisationData();

  let form = FormApp.openById(form_id);

  let responses = {};

  let formTitle = form.getTitle();
  let formType = 'Google Forms';
  var formResponses = form.getResponses();

  for (var i = 0; i < formResponses.length; i++) {
    responses['response: ' + i] = {
      'questions': {}
    };

    var formResponse = formResponses[i];
    var itemResponses = formResponse.getItemResponses();

    for (var j = 0; j < itemResponses.length; j++) {
      /* Set questions and answers */
      var itemResponse = itemResponses[j];
    
      if (itemResponse.getItem().getTitle() == 'Choose a DiSSCo Organisation:') {
        let ror = organisationsData[itemResponse.getResponse()]['ror'];
        
        if (!responses['response: ' + i]['organisation_id']) {
          responses['response: ' + i]['organisation_id'] = ror;
        }
      } else {
        if (!responses['response: ' + i]['questions'][itemResponse.getItem().getTitle()]) {
          responses['response: ' + i]['questions'][itemResponse.getItem().getTitle()] = [itemResponse.getResponse()];
        } else {
          responses['response: ' + i]['questions'][itemResponse.getItem().getTitle()].push(itemResponse.getResponse());
        }
      }

      /* Set general form info */
      responses['response: ' + i]['form_id'] = form_id;
      responses['response: ' + i]['form_type'] = formType;
      responses['response: ' + i]['form_title'] = formTitle;
    }
  }

  /* Insert records into #document store# (database) */
  postOrganisationData(responses, process);

  function process(check) {
    return check;
  } 
}

function exportMonkeyForm(survey_id, auth, survey_title) {
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
    let formType = 'SurveyMonkey';
    let i = 0;

    for (key in data) {
      responses['response: ' + i] = {
        'questions': {}
      };
      
      let responseIndicator = 'response: ' + i;
      let respondent = data[key];

      for (key in respondent['pages']) {
        let page = respondent['pages'][key];

        for (key in page['questions']) {
          /* Set questions and answers */
          let question = page['questions'][key];

          if (question.heading == 'Choose a DiSSCo Organisation:') {
            let organisationText = question['answers'][0]['simple_text'].replace('Organisation: | Choose | ', '');
            let ror = organisationsData[organisationText]['ror'];

            if (!responses[responseIndicator]['organisation_id']) {
              responses[responseIndicator]['organisation_id'] = ror;
            }
          } else {
            if (!responses[responseIndicator]['questions'][question['heading']]) {
              responses[responseIndicator]['questions'][question['heading']] = [question['answers'][0]['simple_text']];
            } else {
              responses[responseIndicator]['questions'][question['heading']].push(question['answers'][0]['simple_text']);
            }
          }
        }
      }

      /* Set general form info */
      responses[responseIndicator]['form_id'] = survey_id;
      responses[responseIndicator]['form_type'] = formType;
      responses[responseIndicator]['form_title'] = survey_title;

      i++;
    }

    postOrganisationData(responses, process);

    function process(check) {
      return check;
    }
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
}






