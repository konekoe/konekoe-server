#  __Konekoe-server__
This is the server side implementation the __Konekoe__ exam tool. The program has been implementated utilizing __Node.js__. Each instance of the program represents a single exam.

The server listens for web socket connections from either
_students_ who are running the __Konekoe OS__ on their personal devices (the server-daemon interface) or from _teachers_ using the __Exam View__ web frontend (server-examView interface).   

Here are the steps for running the program:

| Step | Explanation |
| ---- | ---- |
| 1. Clone the repository. |  |
| 2. Run `npm install` | This installs the dependencies listed in the _package.json_ file |
| 3. Create and a `.env` file | This file is used for configuring the server. See [0.2](#config) for details. |
| 4. Run `npm run` | This is an npm script used for executing the program. |

A containerized version is also available. The container image expects to find an ssh key called id_rsa in your `$HOME/.ssh/` directory. This key should have access to the version.aalto repos associated with this project as it is used to download project dependencies.

`docker run --network=<networkName> -d -p <port>:<port> -v $HOME/konekoe-server/.data:/.data/ --env-file ./.env -e EXAMCODE=<examCode> -e PORT=<port> --name <examCode> konekoe-server:1.0` <br/>
Or<br/>
`npm run start_container <port> <examCode>`

Containers should run on the same network as the mongoDb database. The .env file can be the same used with the uncontainerized version, but for convinience it is a good idea
to pass the exam code as an evironment variable with the run command as it is specific to each exam instance. Furthermore, the published port should be the same as the internal port used by the application as it is recorded in the database and later passed to the exam daemon.

## Documentation
This document is intended to instruct in the usage of this program by authorized personel. For more
detailed technical documentation see [PLACEHOLDER]("http://placeholder.com").  

---

## TABLE OF CONTENTS
0. [Sidenotes](#notes)
    - 0.1 [logging](#logging)
    - 0.2 [configuration](#config)
    - 0.3 [testing](#test)
1. [Server - daemon interface](#serverDaemon)
    - 1.0 [overview](#daemonOverview)
    - 1.1 [connecting phase](#daemonConnection)

2. [Server - Exam View interface](#serverView)
    - 2.0 [overview](#viewOverview)
    - 2.1 [login](#viewLogin)
    - 2.2 [communication](#viewAdditional)

---

### Sidenotes <a id="notes"></a>

#### logging <a id="logging"></a>

The __Winston 3__ package ([documentation](https://github.com/winstonjs/winston)) is used for all logging by the server. The server has its own log file of the form _konekoe-server.log_, which is created __when the winston logger class is instanced__ at the beginning of execution. This logger is called _`generalLogger`_. Every student who has signed in also has their own logging file of the form _konekoe-student.log_. All log files are by default stored under the `log/` directory. For more details, see [the serverside logging package](https://version.aalto.fi/gitlab/konekoe/konekoe-server-log).

***

#### configuration <a id="config"></a>

In order to run the program a `.env` file has to be created in the root of the project.
This file must contain the following fields:

| Field | Explanation |
| ---- | ---- |
| `DATABASE_URI` | Address of the database |
| `DATABASE_USER` | Username for database authentication |
| `DATABASE_PASS` | Password for database authentication |
| `PORT` | The port to listen to for incoming connections |
| `EXAMCODE` | The exam code |
| `JWT_PRIVATE` | Path to the private key used for creating JWTs (Json Web Tokens) |
| `JWT_PUBLIC` | Path to the public key used for decrypting JWTs |
| `JWT_ISSUER`| This should match the configuration of __Exam Site__ |
| `JWT_SUBJECT` | This should match the configuration of __Exam Site__ |
| `JWT_AUDIENCE` | This should match the configuration of __Exam Site__ |
| `JWT_EXPIRESIN` | This should match the configuration of __Exam Site__ |
| `JWT_ALGORITHM` | This should match the configuration of __Exam Site__ |
| `ROOT_CERT` | Path to the certificate of this server |
| `ROOT_KEY` | Path to the private key of this server |
| `DAEMON_CERT` | Path to the daemon root cert |

***
#### Testing <a id="test"></a>

TODO
***

### Server-daemon interface <a id="serverDaemon"></a>

#### overview <a id="daemonOverview"></a>

Communication between the daemon and the server is done over __Web Sockets__ using the [_`ws`_ package](https://github.com/websockets/ws/blob/HEAD/doc/ws.md). The protocol used for communication is described [here](https://version.aalto.fi/gitlab/konekoe/general/blob/master/PROTOCOL.md). Clients are authenticated with a JWT which should be received during a `connection` message.
 ***

#### connecting phase <a id="daemonConnection"></a>

When the server receives a new connection it creates an instance of the `MessageHandler` class. This
class functions as a wrapper around the socket for handling incoming messages using handler functions defined in the `handlers/` directory.

The handler is determined by the `type` field of the incoming message. At first, `MessageHandler` only handles `connection` messages, the handler functions for which are listed in __handlers/index.js__. Other messages are pushed to a message queue. Once a `connection` message has been received and processed, `MessageHandler` emits an event corresponding the  `type` of the message. For instance, a `student` event is emitted once a `server_connection` message has been processed. The event is caught by the surrounding program and a client object is created to represent the client who has connected. For instance, a `student` event results in a `Student` object. The `MessageHandler` is passed to the created client object which registers additional message handlers to the `MessageHandler`. After the client object has been initialised, `MessageHandler` clears its message queue and all future messages are passed to their corresponding handlers. This process repeats upon reconnection but the new `MessageHandler` is passed to an existing client object.

---

### Server-examView interface <a id="serverView"></a> __`Old version`__
#### overview <a id="viewOverview"></a>


Exam View is a React.js utility meant for course personel. It's used for monitoring exams and making changes to an exam's configuration on the fly. For example course personel can set the EXAMEND field in the config in case the start of the exam is delayed. Exam View can also be used to view screenshots taken by the daemon as well as read log entries made by the server. __Socket.io__ (https://socket.io/) is used in communication between the server and Exam View. The server keeps track of active exams and a structure of all exams active or not and of a selection that can be a course, a date and a student (an exam is a course-date pair). The structure of exams (_user_data_) is build from the directory structure of log/ and is used for storing logs and screenshots and sending this information to Exam View. The selection is used to group sockets based on course, date or ID: if only a course is selected everyone who has attended an exam in that course is selected, select a date aswell and everyone in the exam on that date are selected.
  ***

#### login <a id="viewLogin"></a>
**NOTE: This should be replaced by cookie based system at some point**

Exam View uses a simple username and password system to keep out any unwanted visitors.

 event        | action           |
| ------------- |:-------------:|
| authenticate      |  Check if a password matching the given user name is found and if it is check the hashed password against the password that was received. Information on wheter or not the login was succesful is emitted back to the client using the same event.|


 ***

#### additional communication <a id="viewAdditional"></a>

Most of the communication between Exam Viewer and the server is described here.

event        | action           |
| ------------- |:-------------:|
| guiReady      | Received when Exam View is ready to receive information. Send the _user_data_ object and the image and log matching the current selection. When Exam View is first run nothing is selected and only _user_data_ is passed but this event is also emitted when the connection between Exam View and the server is broken.|
| changeConf | Used to make changes to an exam's configuration based on the received object _info_. Info.type refers to the field in the config that is to be altered. Currently alterations to the blacklist, whitelist, exam end time and screenshot interval are supported. |
| changeTime | Used to set the interval of screenshots. Should probably be changed to a subcase of changeConf. |
| screenShotNow | Send a screenshot request __SCRNW__ to all selected sockets. |
| changeImage | Send a new screenshot image to Exam View based on the current selection and the received _info_ object. |
| slideShow | Set up or clear a timer for sending screenshots to Exam View with even intervals. Currently the interval is 5.0s. |
| updateSelection | Update the selection based on user input. |

***
