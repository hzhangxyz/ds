import { rule_t, search_t } from "../tsds/tsds.mts";

function main() {
    const temp_data_size = 1000;
    const single_result_size = 10000;

    const search = new search_t(temp_data_size, single_result_size);

    // P -> Q, P |- Q
    search.add("(`P -> `Q) `P `Q\n");
    // p -> (q -> p)
    search.add("(`p -> (`q -> `p))");
    // (p -> (q -> r)) -> ((p -> q) -> (p -> r))
    search.add("((`p -> (`q -> `r)) -> ((`p -> `q) -> (`p -> `r)))");
    // (!p -> !q) -> (q -> p)
    search.add("(((! `p) -> (! `q)) -> (`q -> `p))");

    // premise
    search.add("(! (! X))");

    const target = new rule_t("X");

    while (true) {
        let success = false;
        const callback = (candidate) => {
            if (candidate.key() === target.key()) {
                console.log("Found!");
                console.log(candidate.toString());
                success = true;
                return true;
            }
            return false;
        };

        search.execute(callback);
        if (success) {
            break;
        }
    }
}

for (let i = 0; i < 10; i++) {
    const begin = new Date();
    main();
    const end = new Date();
    console.log(`Time taken: ${(end - begin) / 1000}s`);
}
