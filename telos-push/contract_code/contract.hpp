#include <eosio/eosio.hpp>

using namespace std;
using namespace eosio;

CONTRACT iotdata : public contract {
  public:
    using contract::contract;

    ACTION updatedata(name nodeid,
                  , float field1,
                  , float field2
                  , float field3
                  , float field4
                  , float field5
                  , float field6
                  , float field7
                  , float field8
                  , float field9
                  , float field10
                  );

  private:

    // Unused variables will be commented out
    TABLE data {
      name nodeid;
      float f1;
      float f2;
      float f3;
      float f4;
      float f5;
      float f6;
      float f7;
      float f8;
      float f9;
      float f10;

      // Set primary key to nodeid which is an eosio name which is a uint64_t
      auto  primary_key() const { return nodeid; }
    };
    typedef multi_index<name("data"), data> data_table;

    float missing_value = -9999;

};
