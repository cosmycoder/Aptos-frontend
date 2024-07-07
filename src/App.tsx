import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Layout, Row, Col, Button, Spin, List, Checkbox, Input } from "antd";
import { Aptos } from "@aptos-labs/ts-sdk";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import {
  useWallet,
  InputTransactionData,
} from "@aptos-labs/wallet-adapter-react";
import { CheckboxChangeEvent } from "antd/es/checkbox";

type Task = {
  address: string;
  completed: boolean;
  content: string;
  task_id: string;
};

function App() {
  const aptos = new Aptos();
  const [tasks, setTasks] = useState<Task[]>([]);
  const { account, signAndSubmitTransaction } = useWallet();
  const [transactionInProgress, setTransactionInProgress] =
    useState<boolean>(false);
  const [newTask, setNewTask] = useState<string>("");
  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewTask(value);
  };

  const moduleAddress =
    "9f47d912c93ccf8a80a701cd7fe672787f4db3033a6624c02b29db4778e4eb33";

  const addNewList = async () => {
    if (!account) return [];
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_list`,
        functionArguments: [],
      },
    };
    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setAccountHasList(true);
    } catch (error: any) {
      setAccountHasList(false);
    } finally {
      setTransactionInProgress(false);
    }
  };

  // const fetchList = async () => {
  //   if (!account) return [];
  //   // change this to be your module account address
  //   const moduleAddress =
  //     "0xcbddf398841353776903dbab2fdaefc54f181d07e114ae818b1a67af28d1b018";
  //   try {
  //     const todoListResource = await aptos.getAccountResource({
  //       accountAddress: account?.address,
  //       resourceType: `${moduleAddress}::todolist::TodoList`,
  //     });
  //     setAccountHasList(true);
  //   } catch (e: any) {
  //     setAccountHasList(false);
  //   }
  // };

  const fetchList = async () => {
    if (!account) return [];
    try {
      const todoListResource = await aptos.getAccountResource({
        accountAddress: account?.address,
        resourceType: `${moduleAddress}::todolist::TodoList`,
      });
      setAccountHasList(true);
      // tasks table handle
      const tableHandle = (todoListResource as any).tasks.handle;
      // tasks table counter
      const taskCounter = (todoListResource as any).task_counter;

      let tasks = [];
      let counter = 1;
      while (counter <= taskCounter) {
        const tableItem = {
          key_type: "u64",
          value_type: `${moduleAddress}::todolist::Task`,
          key: `${counter}`,
        };
        const task = await aptos.getTableItem<Task>({
          handle: tableHandle,
          data: tableItem,
        });
        tasks.push(task);
        counter++;
      }
      // set tasks in local state
      setTasks(tasks);
    } catch (e: any) {
      setAccountHasList(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [account?.address]);

  const [accountHasList, setAccountHasList] = useState<boolean>(false);

  const onTaskAdded = async () => {
    // check for connected account
    if (!account) return;
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::create_task`,
        functionArguments: [newTask],
      },
    };

    // hold the latest task.task_id from our local state
    const latestId =
      tasks.length > 0 ? parseInt(tasks[tasks.length - 1].task_id) + 1 : 1;

    // build a newTaskToPush object into our local state
    const newTaskToPush = {
      address: account.address,
      completed: false,
      content: newTask,
      task_id: latestId + "",
    };

    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });

      // Create a new array based on current state:
      let newTasks = [...tasks];

      // Add item to the tasks array
      newTasks.push(newTaskToPush);
      // Set state
      setTasks(newTasks);
      // clear input text
      setNewTask("");
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const transaction: InputTransactionData = {
    data: {
      function: `${moduleAddress}::todolist::create_task`,
      functionArguments: [newTask],
    },
  };

  const onCheckboxChange = async (
    event: CheckboxChangeEvent,
    taskId: string
  ) => {
    if (!account) return;
    if (!event.target.checked) return;
    setTransactionInProgress(true);
    const transaction: InputTransactionData = {
      data: {
        function: `${moduleAddress}::todolist::complete_task`,
        functionArguments: [taskId],
      },
    };

    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(transaction);
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });

      setTasks((prevState) => {
        const newState = prevState.map((obj) => {
          // if task_id equals the checked taskId, update completed property
          if (obj.task_id === taskId) {
            return { ...obj, completed: true };
          }

          // otherwise return object as is
          return obj;
        });

        return newState;
      });
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  return (
    <>
      <Layout>
        <Row align="middle">
          <Col span={10} offset={2}>
            <h1>Our todolist</h1>
          </Col>
          <Col span={12} style={{ textAlign: "right", paddingRight: "200px" }}>
            <WalletSelector />
          </Col>
        </Row>
      </Layout>

      <>
        <Spin spinning={transactionInProgress}>
          {!accountHasList ? (
            <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
              <Col span={8} offset={8}>
                <Button
                  onClick={addNewList}
                  block
                  type="primary"
                  style={{ height: "40px", backgroundColor: "#3f67ff" }}
                >
                  Add new list
                </Button>
              </Col>
            </Row>
          ) : (
            <Row gutter={[0, 32]} style={{ marginTop: "2rem" }}>
              <Col span={8} offset={8}>
                {tasks && (
                  <List
                    size="small"
                    bordered
                    dataSource={tasks}
                    // renderItem={(task: any) => (
                    //   <List.Item actions={[<Checkbox />]}>
                    //     <List.Item.Meta
                    //       filename="{task.content}
                    //       description={
                    //         <a
                    //           href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                    //           target="_blank"
                    //         >{`${task.address.slice(0, 6)}...${task.address.slice(-5)}`}</a>
                    //       }
                    //     />
                    //   </List.Item>
                    // )}

                    renderItem={(task: any) => (
                      <List.Item
                        actions={[
                          <div>
                            {task.completed ? (
                              <Checkbox defaultChecked={true} disabled />
                            ) : (
                              <Checkbox
                                onChange={(event) =>
                                  onCheckboxChange(event, task.task_id)
                                }
                              />
                            )}
                          </div>,
                        ]}
                      >
                        <List.Item.Meta
                          description={
                            <a
                              href={`https://explorer.aptoslabs.com/account/${task.address}/`}
                              target="_blank"
                            >{`${task.address.slice(
                              0,
                              6
                            )}...${task.address.slice(-5)}`}</a>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Col>
              <Col span={8} offset={8}>
                <Input.Group compact>
                  <Input
                    onChange={(event) => onWriteTask(event)} // add this
                    style={{ width: "calc(100% - 60px)" }}
                    placeholder="Add a Task"
                    size="large"
                    value={newTask} // add this
                  />
                  <Button
                    onClick={onTaskAdded} // add this
                    type="primary"
                    style={{ height: "40px", backgroundColor: "#3f67ff" }}
                  >
                    Add
                  </Button>
                </Input.Group>
              </Col>
            </Row>
          )}
        </Spin>
      </>
    </>
  );
}

export default App;
