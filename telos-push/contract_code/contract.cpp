#include <contract.hpp>

using namespace std;
using namespace eosio;

ACTION iotdata::updatedata(name nodeid
                  , float field1
                  , float field2
                  , float field3
                  , float field4
                  , float field5
                  , float field6
                  , float field7
                  , float field8
                  , float field9
                  , float field10
                  ) {

  // Only self can run this Action
  require_auth(get_self());

  // Init the _data table
  d_type _data(get_self(), get_first_receiver().value);

  auto iterator = _data.find(nodeid.value);
  if( iterator == _data.end() ) // User is not in the table
  {
    // Add the row to the observation set
    _data.emplace(nodeid, [&](auto& dat) {
      dat.f1 = field1;
      dat.f2 = field2;
      dat.f3 = field3;
      dat.f4 = field4;
      dat.f5 = field5;
      dat.f6 = field6;
      dat.f7 = field7;
      dat.f8 = field8;
      dat.f9 = field9;
      dat.f10 = field10;
    });
  } else { // User is in the table
    _data.modify(iterator, nodeid, [&](auto& dat) {
      dat.f1 = field1;
      dat.f2 = field2;
      dat.f3 = field3;
      dat.f4 = field4;
      dat.f5 = field5;
      dat.f6 = field6;
      dat.f7 = field7;
      dat.f8 = field8;
      dat.f9 = field9;
      dat.f10 = field10;
    });

  }

}

ACTION iotdata::updatefields(name nodeid
                  , string field1
                  , string field2
                  , string field3
                  , string field4
                  , string field5
                  , string field6
                  , string field7
                  , string field8
                  , string field9
                  , string field10
                  ) {

  // Only self can run this Action
  require_auth(get_self());

  // Init the _fields table
  f_type _fields(get_self(), get_first_receiver().value);

  // Add the row to the observation set
  auto iterator = _fields.find(nodeid.value);
  if( iterator == _fields.end() ) // User is not in the table
  {
    // Add the row to the observation set
    _fields.emplace(nodeid, [&](auto& dat) {
      dat.f1 = field1;
      dat.f2 = field2;
      dat.f3 = field3;
      dat.f4 = field4;
      dat.f5 = field5;
      dat.f6 = field6;
      dat.f7 = field7;
      dat.f8 = field8;
      dat.f9 = field9;
      dat.f10 = field10;
    });
  } else { // User is in the table
    _fields.modify(iterator, nodeid, [&](auto& dat) {
      dat.f1 = field1;
      dat.f2 = field2;
      dat.f3 = field3;
      dat.f4 = field4;
      dat.f5 = field5;
      dat.f6 = field6;
      dat.f7 = field7;
      dat.f8 = field8;
      dat.f9 = field9;
      dat.f10 = field10;
    });

  }

}

// Dispatch the actions to the blockchain
EOSIO_DISPATCH(iotdata, (updatedata)(updatefields))