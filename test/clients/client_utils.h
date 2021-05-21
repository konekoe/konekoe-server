#ifndef HH_UTILS_OPS
#define HH_UTILS_OPS

struct Conn {
  int socket;
  char student_id[10];
  char* exam_code;
};

#define LENGTH_OF_COMMAND 5

int receive_int(unsigned int *num, int fd);

int receive_char_arr(char* str, const int size, int fd);

int receive_command(char* str, int fd);

int send_int(const unsigned int num, int fd);

int send_char_arr(const char* str, int size, int fd);

int send_command(const char* str, int fd);

#endif
