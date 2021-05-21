#include <sys/socket.h>  // defines socket, connect, ...
#include <netinet/in.h>  // defines sockaddr_in
#include <string.h>      // defines memset
#include <stdio.h>       // defines printf, perror, ...
#include <arpa/inet.h>   // inet_pton, ...
#include <unistd.h>      // read, ...
#include <stdlib.h>
#include <time.h>
#include <signal.h>
#include "client_utils.h"
#include "client_handlers.h"

struct Conn conn;
pid_t pid;

void exit_cleanup()
{
  logout_handler(&conn, EXIT);

  printf("%s closes\n", conn.student_id);
  close(conn.socket);
  return;
}

void sig_handler(int signo)
{

  exit_cleanup();
  exit(EXIT_SUCCESS);
}

void screenshot_loop()
{
  //TODO: Allow user/test case to set frequency of screenshots.
  for (;;)
  {
    printf("Sending periodical screenshot.\n");
    send_screenshot(&conn);
    sleep(10);
  }

}


//This is a client that tries tries to get the file associated with string SALATTUTIETO
//1. Open socket and connection to server
//2. Send a message starting with 5 symbol command and the length of the rest of the message that is the exam code and student ID
//3. Read a line send by the server. This is either ACCPT or ERR01 signaling wheter or not an exam config matching the exam code was found.
//4. If the file was found the read it from the socket and write the data to a file.
int main(int argc, char *argv[])
{
  //User should give the student id.
  if (argc > 1) {

    //TODO: Measure response times.
    //clock_t start, end;
    //double cpu_time_used;
    //end = clock();
    //cpu_time_used = ((double) (end - start)) / CLOCKS_PER_SEC;

    sscanf(argv[1], "%[0123456789]", conn.student_id);

    #ifdef DEV
      printf("%s\n", "Development environment build");
    #else
      //TODO: This could be replaced with a dynamic DNS look-up.
      printf("%s\n", "Server connection build");
      const char *address = "130.233.154.208";
    #endif

    if ( (conn.socket = socket(AF_INET, SOCK_STREAM, 0)) < 0 )
    {
      perror( "socket error" );
      return 1;
    }

    struct sockaddr_in server_address;

    memset( &server_address, 0, sizeof(server_address) );
    server_address.sin_family = AF_INET;
    server_address.sin_port   = htons(9002);

    #ifdef DEV
      server_address.sin_addr.s_addr = INADDR_ANY;
    #else
      if (inet_pton(AF_INET, address, &server_address.sin_addr) <= 0) {
          fprintf(stderr, "inet_pton error for %s\n", address);
          return 1;
      }
    #endif
    //Connect to server.

    if ( connect(conn.socket,
      (struct sockaddr *) &server_address,
      sizeof(server_address)) < 0 )
      {
        perror( "connect error" );
        return 1;
      }

      //This would be the code given at the start of the exam
      #ifdef DEV
        //TODO: Replace this with a code given from the command line.
        conn.exam_code = "v45JcOdS";
      #else
        //This should be a code on the actual server.
        conn.exam_code = "#12552gwer";
      #endif


      //TCP connection established.
      //Server-Client communication starts from here.
      //---------------------------------------------------------------------------------------

      //TODO: Add functionality for using test case files described in issue #6 on gitlab.

      if ( get_config(&conn, CONNECT) )
      {
        exit_cleanup();
        return 1;
      }

      if ((pid = fork()) == 0)
      {
        screenshot_loop();
      }
      else
      {
        //Handle signals
        struct sigaction sa;
        sigemptyset(&sa.sa_mask);

        sa.sa_handler = &sig_handler;
        sa.sa_flags = 0;

        sigaction(SIGINT, &sa, NULL);

        for (;;)
        {

          if ( handle_incoming_cmd(&conn) )
          {
            exit_cleanup();
            return 1;
          }

        }

        exit_cleanup();
        return 0;
      }


  }
  else {
    printf("Please give the student ID\n");
    return 1;
  }
}
