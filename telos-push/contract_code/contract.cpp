#include <contract.hpp>

using namespace std;
using namespace eosio;

ACTION placeholder0::appenddata(float placeholder1
                              , float placeholder2
                              , float placeholder3
                              , float placeholder4
                              , float placeholder5
                              , float placeholder6
                              , float placeholder7
                              , float placeholder8
                              , float placeholder9
                              , float placeholder10
                              , float placeholder11
                              , float placeholder12
                              , float placeholder13
                              , float placeholder14
                              , float placeholder15
                              , float placeholder16
                              , float placeholder17
                              , float placeholder18
                              , float placeholder19
                              , float placeholder20
                          ) {

  // Only self can run this Action
  require_auth(get_self());

  // Init the _data table
  data_table _data(get_self(), get_self().value);

  // Add the row to the observation set
  _data.emplace(get_self(), [&](auto& dat) {
      dat.placeholder1 = placeholder1;
      dat.placeholder2 = placeholder2;
      dat.placeholder3 = placeholder3;
      dat.placeholder4 = placeholder4;
      dat.placeholder5 = placeholder5;
      dat.placeholder6 = placeholder6;
      dat.placeholder7 = placeholder7;
      dat.placeholder8 = placeholder8;
      dat.placeholder9 = placeholder9;
      dat.placeholder10 = placeholder10;
      dat.placeholder11 = placeholder11;
      dat.placeholder12 = placeholder12;
      dat.placeholder13 = placeholder13;
      dat.placeholder14 = placeholder14;
      dat.placeholder15 = placeholder15;
      dat.placeholder16 = placeholder16;
      dat.placeholder17 = placeholder17;
      dat.placeholder18 = placeholder18;
      dat.placeholder19 = placeholder19;
      dat.placeholder20 = placeholder20;
    });

}

// Dispatch the actions to the blockchain
EOSIO_DISPATCH(placeholder0, (appenddata))