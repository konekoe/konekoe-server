CPP      = g++
CC       = gcc
OBJ      = main.o client_utils.o client_handlers.o
LINKOBJ  = main.o client_utils.o client_handlers.o
CFLAGS = -std=gnu99 -Wall -g -c
BIN	 = test_client

#Use debug on your local machine.
dev: CFLAGS += -DDEV -g
dev: BIN = test_client_dev

LOGS = log/*

.PHONY: all all-before all-after clean clean-custom

build: $(BIN)
dev: $(BIN)

$(BIN): $(OBJ)
	$(CC) $(LINKOBJ) -o $(BIN) #$(LIBS)

./%.o: ./%.c
	$(CC) $(CFLAGS) $< -o $@

.PHONY : clean
clean :
	-rm -rf $(OBJ) $(BIN) $(BIN)_dev

clean_log :
	rm -R -- $(LOGS)
