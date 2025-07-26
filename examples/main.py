import time
import pyds


def main():
    temp_data_size = 1000
    single_result_size = 10000

    search = pyds.Search(temp_data_size, single_result_size)

    # P -> Q, P |- Q
    search.add("(`P -> `Q) `P `Q\n")
    # p -> (q -> p)
    search.add("(`p -> (`q -> `p))")
    # (p -> (q -> r)) -> ((p -> q) -> (p -> r))
    search.add("((`p -> (`q -> `r)) -> ((`p -> `q) -> (`p -> `r)))")
    # (!p -> !q) -> (q -> p)
    search.add("(((! `p) -> (! `q)) -> (`q -> `p))")

    # premise
    search.add("(! (! X))")

    target = pyds.Rule("X")

    while True:
        success = False

        def callback(candidate: pyds.Rule) -> bool:
            if candidate == target:
                print("Found!")
                print(candidate)
                nonlocal success
                success = True
                return True
            return False

        search.execute(callback)
        if success:
            break


for i in range(10):
    begin = time.time()
    main()
    end = time.time()
    print(end - begin)
