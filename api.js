const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

const MongoClient = require("mongodb").MongoClient;
const url =
  "mongodb+srv://jobTrackerAdmin:jobTrackerHelio@cluster0-hnauw.mongodb.net/test?retryWrites=true&w=majority";
const dbName = "Job-Tracker";
const ObjectId = require("mongodb").ObjectId;

app.use(express.json());
app.use(cors());

//get all students

app.get("/students", (req, res) => {
  MongoClient.connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true },
    function(err, client) {
      if (!err) {
        const db = client.db(dbName);
        const collection = db.collection("jobs");
        const allInfo = [];
        collection.find({}).toArray((err, docs) => {
            docs.map(info => {
                    const {password, ...studentInfo} = info;
                    allInfo.push(studentInfo);
            })
          client.close();
          res.send(allInfo);
        });
      } else {
        client.close();
        console.log(err);
      }
    }
  );
});

//search for student

app.get('/students/:studentName', (req, res) => {
    MongoClient.connect(
        url,
        { useNewUrlParser: true, useUnifiedTopology: true },
        function(err, client) {
          if (!err) {
            const db = client.db(dbName);
            const collection = db.collection("jobs");
            collection.find({name: req.params.studentName}).toArray((err, docs) => {
              client.close();
              const {password, ...newDocs} = docs[0];
              res.send(newDocs);
            });
          } else {
            client.close();
            console.log(err);
          }
        }
      );
    });

//get only a single student

app.get('/home/:ID', (req, res) => {
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
        const db = client.db(dbName);
        const collection = db.collection("jobs");
        collection.find({_id: ObjectId(req.params.ID)}).toArray((err, docs) => {
            if(!err) {
                client.close();
                const {password, ...newDocs} = docs[0];
                res.send(newDocs);
            }
            else {
                res.send(err);
            }
        })
    })
});

//get student jobs list

app.get('/jobs/:ID', (req, res) => {
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
        const db = client.db(dbName);
        const collection = db.collection("jobs");
        collection.find({_id: ObjectId(req.params.ID)}).toArray((err, docs) => {
            if(!err) {
                client.close();
                const {password, email, _id, name, ...newDocs} = docs[0];
                res.send(newDocs);
            }
            else {
                res.send(err);
            }
        })
    })
});

//Student login verification

app.put('/login', (req, res) => {
    MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, (err, client) => {

        if(req.body.password == undefined || req.body.email == undefined) {
            throw 'Blank email or password';
        }

        else if(!err) {
            const db = client.db(dbName);
            const collection = db.collection('jobs');

            if(collection.find({email: req.body.email})) {
                collection.find({email: req.body.email}).toArray((err, info) => {
                    if(req.body.password === info[0].password) {
                        client.close();
                        let personInfo = {id: info[0]._id, adminAccess: info[0].adminAccess }
                        res.send(personInfo);
                    }
                    else {
                        res.send(false)
                    }
                })
            } 
            }
            
        else {
            res.send(err);
        }
    })
})

//create a new student

app.post("/signup", (req, res) => {
  if (req.body.password === req.body.confirm) {
    MongoClient.connect(
      url,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err, client) => {
        if (!err) {
          const db = client.db(dbName);
          const collection = db.collection("jobs");
          collection.insertMany([
            {
              name: req.body.name,
              email: req.body.email,
              password: req.body.password,
              adminAccess: req.body.adminAccess,
              jobs: []
            }
          ]);
          client.close();
          res.send(`Successfully added ${req.body.name}`);
        } else {
          client.close();
          res.send(err);
        }
      }
    );
  } else {
    res.send(`Passwords do not match, ${req.body.name} not added.`);
  }
});

//add jobs

app.put("/jobs/:ID", (req, res) => {
  MongoClient.connect(
    url,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
      if (!err) {
        const db = client.db(dbName);
        const collection = db.collection("jobs");
        collection.find({_id: ObjectId(req.params.ID)}).toArray(async (err, docs) => {

            if(docs[0].jobs === undefined) {
                res.send('no existing jobs');
            }

            else {
                docs[0].jobs.push(req.body);
                const {_id, ...newDoc} = docs[0];
                await collection.updateOne({_id: ObjectId(req.params.ID)}, {$set: newDoc}, {upsert: true});
                client.close();
                res.send(newDoc);
            }
        }); 
      } else { 
        client.close();
        res.send(err);  
      }
    }
  );
});

//delete student

app.delete('/:ID', (req, res) => {
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
        const db = client.db(dbName);
        const collection = db.collection("jobs");
        collection.deleteOne({_id: ObjectId(req.params.ID)});
        res.send('User Deleted');
    })
})

//delete job

app.delete('/jobs/:ID/:jobName', (req, res) => {
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
        const db = client.db(dbName);
        const collection = db.collection("jobs");
        let toSend = false;
        collection.find({_id: ObjectId(req.params.ID)}).toArray((err, docs) => {
            let newDocs = docs[0].jobs;
            for(let i = 0; i < newDocs.length; i++) {
                if(newDocs[i].company_name === req.params.jobName) { 
                    toSend = false; 
                    docs[0].jobs.splice(i, 1);
                    const {_id, ...newDoc} = docs[0];
                    collection.updateOne({_id: ObjectId(req.params.ID)}, {$set: newDoc}, {upsert: true});
                    client.close();
                    res.send(newDocs)
                    break;
                }
                else{
                    toSend = true;
                }
            }
            if(toSend === true) {
                res.send(`${req.params.jobName} not found`);
            }
        })
    })
})

app.listen(port, () => console.log(`Listening on port ${port}`));
