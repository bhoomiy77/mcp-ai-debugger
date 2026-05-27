const API =
'https://mcp-ai-debugger.onrender.com/users'

window.latestError = ''

window.addEventListener(

    'error',

    function(event) {

        const errorMessage =

            event.message
            ||
            event.error?.message
            ||
            'Unknown Error'

        console.log(
            'Captured Error:',
            errorMessage
        )

        window.latestError = errorMessage

localStorage.setItem(
    'latestError',
    errorMessage
)

        if (
            document.getElementById(
                'chatBox'
            )
        ) {

            addBotMessage(`

                <strong>Browser Error:</strong>

                <br><br>

                ${errorMessage}
            `)
        }
    }
)


async function fetchUsers() {

    try {

        const response =
            await axios.get(API)

        const data =
            response.data

        let output = ''

        if (
            Array.isArray(data)
        ) {

            data.forEach((user) => {

                output += `

                    <div class="user-card">

                        <h3>
                            ${user.name}
                        </h3>

                        <p>
                            ${user.email}
                        </p>

                    </div>
                `
            })

            document.getElementById(
                'userList'
            ).innerHTML = output

        } else {

            console.log(data)

            addBotMessage(
                'Backend is not returning array'
            )
        }

    } catch (error) {

        console.log(error)

        addBotMessage(
            'Failed to fetch users'
        )
    }
}

fetchUsers()


async function addUser() {

    try {

        const name =
            document.getElementById(
                'name'
            ).value

        const email =
            document.getElementById(
                'email'
            ).value

        if (
            !name ||
            !email
        ) {

            addBotMessage(
                'Please enter name and email'
            )

            return
        }

        await axios.post(
            API,
            {
                name,
                email
            }
        )

        fetchUsers()

    } catch (error) {

        console.log(error)

        addBotMessage(
            'Failed to add user'
        )
    }
}


function addUserMessage(message) {

    const chatBox =
        document.getElementById(
            'chatBox'
        )

    if (!chatBox) return

    chatBox.innerHTML += `

        <div class="user-message">

            ${message}

        </div>
    `

    chatBox.scrollTop =
        chatBox.scrollHeight
}


function addBotMessage(message) {

    const chatBox =
        document.getElementById(
            'chatBox'
        )

    if (!chatBox) return

    chatBox.innerHTML += `

        <div class="bot-message">

            ${message}

        </div>
    `

    chatBox.scrollTop =
        chatBox.scrollHeight
}


async function sendMessage() {
    console.log(
    'SEND MESSAGE RUNNING'
)

window.latestError =
    localStorage.getItem(
        'latestError'
    )

console.log(
    'LATEST ERROR:',
    window.latestError
)

    try {

        const input =
            document.getElementById(
                'userInput'
            )

        const message =
            input.value.trim()

        if (!message) return

        addUserMessage(message)

        input.value = ''

        if (
            !window.latestError
        ) {

            addBotMessage(
                'No browser error found'
            )

            return
        }

        addBotMessage(
            'Analyzing bug...'
        )

        const response =
            await axios.post(

                'https://mcp-ai-debugger.onrender.com/auto-fix',

                {
                    error:
                        window.latestError
                }
            )

        if (
            response.data.success
        ) {

            addBotMessage(`

                <strong>
                    Bug Detected:
                </strong>

                <br><br>

                ${response.data.summary.bugDetected}

                <br><br>

                <strong>
                    Fix Applied:
                </strong>

                <br><br>

                ${response.data.summary.fixApplied}

                <br><br>

                <strong>
                    Status:
                </strong>

                <br><br>

                ${response.data.summary.status}

                <br><br>

                <strong>
                    Fixed Code:
                </strong>

                <br><br>

                <pre>
${response.data.fixedCode}
                </pre>
            `)

            window.latestError = ''

            setTimeout(() => {

                location.reload()

            }, 4000)

        } else {

            addBotMessage(`

                <strong>
                    Error:
                </strong>

                <br><br>

                ${response.data.message}
            `)
        }

    } catch (error) {

        console.log(
    'AUTO FIX ERROR:',
    error
)

console.log(
    error.response
)

console.log(
    error.message
)

        addBotMessage(
            'Auto fix failed'
        )
    }
}